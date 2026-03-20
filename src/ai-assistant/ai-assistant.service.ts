import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { QualificationService } from '../qualification/qualification.service';

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private openai: OpenAI;

  private readonly SYSTEM_PROMPT = `Ти — AI-асистент компанії "Мебелька" з підбору меблів на замовлення. Ти спілкуєшся з клієнтами в Instagram Direct.

ТВОЯ МЕТА:
Ввічливо та професійно зібрати повну інформацію про замовлення клієнта, щоб менеджер міг підготувати точну пропозицію.

СТИЛЬ СПІЛКУВАННЯ:
- Українська мова, ввічливий та дружній тон
- Задавай по одному питанню за раз, не перевантажуй клієнта
- Якщо клієнт пише нечітко ("щось недороге", "невелику"), уточнюй конкретніше
- Ніколи не називай точних цін — кажи "менеджер зорієнтує по вартості після замірів"
- Не будь нав'язливим

ПАРАМЕТРИ ДЛЯ ЗБОРУ:
1. Тип меблів (кухня, шафа, стіл, диван, комод, ліжко тощо)
2. Розміри (довжина, ширина, висота)
3. Стиль (модерн, класика, мінімалізм, лофт тощо)
4. Матеріали (МДФ, ДСП, масив дерева, метал, скло тощо)
5. Бюджет (загальний або вартість за 1 м²)
6. Терміни виготовлення
7. Додаткові побажання (колір, фурнітура, підсвічування тощо)

СЦЕНАРІЙ:
1. Привітай клієнта: "Вітаю! Я — асистент з підбору меблів компанії Мебелька. Допоможу зібрати інформацію, щоб наші майстри підготували для вас найкращу пропозицію 🪑✨"
2. Запитай тип меблів
3. Послідовно збирай решту параметрів
4. Якщо клієнт дає неповну інформацію — перепитай: "Чи правильно я розумію, що...?"
5. Коли всі параметри зібрані, підсумуй замовлення та скажи: "Дякуємо за інформацію! Наш менеджер зв'яжеться з вами найближчим часом для уточнення деталей та розрахунку вартості 📲"

НАШІ АДРЕСИ (якщо клієнт запитає):
- Правий берег: ТЦ "Будинок Меблів", бульвар Миколи Міхновського, 23 (район ст. метро "Звіринецька")
- Лівий берег: ТЦ "Ваш Дім", вул. Катерини Гандзюк, 2 (напроти 4-го входу в "Даринок", район ст. метро Лісова)
- Офіс: Харківське шосе 201/203

ВАЖЛИВО:
- Якщо клієнт запитує щось не пов'язане з меблями, ввічливо поверни розмову до теми
- Використовуй функцію extractOrderParams щоразу, коли клієнт повідомляє нові параметри замовлення`;

  constructor(
    private readonly prisma: PrismaService,
    private readonly qualificationService: QualificationService
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy_string',
    });
  }

  async processUserMessage(leadId: number, userText: string, attachmentNote?: string): Promise<string> {
    try {
      const messageText = attachmentNote ? `${userText || ''} ${attachmentNote}`.trim() : userText;

      // Save user message
      await this.prisma.message.create({
        data: { text: userText, sender_id: 'user', role: 'user', lead_id: leadId },
      });

      // Fetch last 15 messages for context
      const messages = await this.prisma.message.findMany({
        where: { lead_id: leadId },
        orderBy: { timestamp: 'desc' },
        take: 15,
      });

      const conversationHistory = messages.reverse().map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.text || '[вкладення]',
      }));

      const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: this.SYSTEM_PROMPT },
        ...conversationHistory,
      ];

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: openAiMessages,
        tools: [
          {
            type: 'function',
            function: {
              name: 'extractOrderParams',
              description: 'Витягує параметри замовлення з діалогу, коли клієнт повідомляє нові дані',
              parameters: {
                type: 'object',
                properties: {
                  type: { type: 'string', description: 'Тип меблів (кухня, шафа, стіл, диван, комод, ліжко тощо)' },
                  dimensions: { type: 'string', description: 'Розміри (довжина × ширина × висота)' },
                  style: { type: 'string', description: 'Стиль (модерн, класика, мінімалізм, лофт тощо)' },
                  materials: { type: 'string', description: 'Матеріали (МДФ, ДСП, масив, метал, скло тощо)' },
                  budget: { type: 'string', description: 'Загальний бюджет клієнта' },
                  price_per_sqm: { type: 'string', description: 'Вартість за 1 м² якщо клієнт вказав' },
                  timeline: { type: 'string', description: 'Бажані терміни виготовлення' },
                  wishes: { type: 'string', description: 'Додаткові побажання (колір, фурнітура, підсвічування тощо)' },
                },
              },
            },
          },
        ],
      });

      const responseMessage = completion.choices[0].message;

      if (responseMessage.tool_calls?.length) {
        for (const toolCall of responseMessage.tool_calls) {
          if (toolCall.type === 'function' && toolCall.function.name === 'extractOrderParams') {
            const params = JSON.parse(toolCall.function.arguments);
            await this.qualificationService.updateLeadParametersAndQualify(leadId, params);
          }
        }
      }

      const botReply = responseMessage.content || 'Зачекайте хвилинку, ми обробляємо ваш запит...';

      await this.prisma.message.create({
        data: { text: botReply, sender_id: 'bot', role: 'bot', lead_id: leadId },
      });

      return botReply;
    } catch (error) {
      this.logger.error('Error in AiAssistantService:', error);
      return 'Вибачте, виникла помилка під час обробки вашого запиту. Спробуйте пізніше.';
    }
  }
}
