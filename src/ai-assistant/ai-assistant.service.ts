import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { QualificationService } from '../qualification/qualification.service';

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private openai: OpenAI;

  // System Prompt on Ukrainian as requested
  private readonly SYSTEM_PROMPT = `Ти — асистент з підбору меблів. Твоє завдання — ввічливо зібрати параметри замовлення (тип: стіл або шафа, розміри, стиль, матеріали, бюджет, терміни та побажання). 
Задавай питання по одному. Не будь нав'язливим. Коли збереш достатньо даних, обов'язково повідом про це користувача.
Твоя мета - допомогти клієнту визначитися з вибором та передати його запит менеджеру.`;

  constructor(
    private readonly prisma: PrismaService,
    private readonly qualificationService: QualificationService
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy_string',
    });
  }

  async processUserMessage(leadId: number, userText: string): Promise<string> {
    try {
      // 1. Save user message to DB
      await this.prisma.message.create({
        data: {
          text: userText,
          sender_id: 'user', // We might want to use actual instagram id, but role is user
          role: 'user',
          lead_id: leadId,
        },
      });

      // 2. Fetch last 15 messages for context
      const messages = await this.prisma.message.findMany({
        where: { lead_id: leadId },
        orderBy: { timestamp: 'desc' },
        take: 15,
      });

      // 3. Prepare messages for OpenAI
      const conversationHistory = messages.reverse().map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text,
      })) as OpenAI.Chat.ChatCompletionMessageParam[];

      const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: this.SYSTEM_PROMPT },
        ...conversationHistory,
      ];

      // 4. Call OpenAI (including tools for extraction)
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o', // using 4o for better function calling
        messages: openAiMessages,
        tools: [
          {
            type: 'function',
            function: {
              name: 'extractOrderParams',
              description: 'Витягує зафіксовані параметри замовлення з діалогу, коли вони з\'являються',
              parameters: {
                type: 'object',
                properties: {
                  type: { type: 'string', description: 'Тип меблів (стіл, шафа тощо)' },
                  dimensions: { type: 'string', description: 'Розміри' },
                  style: { type: 'string', description: 'Стиль меблів' },
                  materials: { type: 'string', description: 'Бажані матеріали' },
                  budget: { type: 'string', description: 'Очікуваний бюджет' },
                  timeline: { type: 'string', description: 'Бажані терміни' },
                  wishes: { type: 'string', description: 'Додаткові побажання' },
                },
              },
            },
          },
        ],
      });

      const responseMessage = completion.choices[0].message;

      // Handle function calls
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        for (const toolCall of responseMessage.tool_calls) {
          if (toolCall.type === 'function' && toolCall.function.name === 'extractOrderParams') {
            const params = JSON.parse(toolCall.function.arguments);
            await this.qualificationService.updateLeadParametersAndQualify(leadId, params);
          }
        }
      }

      const botReply = responseMessage.content || 'Зачекайте хвилинку, ми обробляємо ваш запит...';

      // 5. Save bot reply to DB
      await this.prisma.message.create({
        data: {
          text: botReply,
          sender_id: 'bot',
          role: 'bot',
          lead_id: leadId,
        },
      });

      return botReply;
    } catch (error) {
      this.logger.error('Error in AiAssistantService:', error);
      return 'Вибачте, виникла помилка під час обробки вашого запиту. Спробуйте пізніше.';
    }
  }
}
