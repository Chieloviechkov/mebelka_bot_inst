import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { QualificationService } from '../qualification/qualification.service';
import { ChatGateway } from '../chat/chat.gateway';

const EXTRACT_ORDER_TOOL: OpenAI.Chat.ChatCompletionTool = {
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
        phone: { type: 'string', description: 'Номер телефону клієнта' },
        location: { type: 'string', description: 'Локація об\'єкта (Київ, область, назва міста)' },
        has_project: { type: 'boolean', description: 'Чи є у клієнта проект або ескіз' },
      },
    },
  },
};

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private openai: OpenAI;

  private readonly SYSTEM_PROMPT = `Ти — AI-асистент компанії "Мебелька" з підбору меблів на замовлення. Ти спілкуєшся з клієнтами в Instagram Direct.

ТВОЯ МЕТА:
Ввічливо та професійно зібрати інформацію про замовлення клієнта, щоб менеджер міг підготувати точну пропозицію.

СТИЛЬ СПІЛКУВАННЯ:
- Українська мова, ввічливий та дружній тон
- Будь природним у розмові, як живий консультант, а не робот з анкетою
- Задавай по одному питанню за раз, не перевантажуй клієнта
- Якщо клієнт пише нечітко ("щось недороге", "невелику"), уточнюй конкретніше
- Ніколи не називай точних цін — кажи "менеджер зорієнтує по вартості"
- НЕ БУДЬ НАВ'ЯЗЛИВИМ — це найважливіше правило

ПАРАМЕТРИ ДЛЯ ЗБОРУ (в будь-якому порядку, залежно від ходу розмови):
- Тип меблів (кухня, шафа, стіл, диван, комод, ліжко тощо)
- Чи є проект або чорновий ескіз? Якщо є — попроси надіслати фото
- Розміри (довжина, ширина, висота). Якщо кухня — чи плануєте до стелі?
- Стиль (модерн, класика, мінімалізм, лофт тощо)
- Матеріали фасаду (МДФ фарбований, ДСП, масив, шпон) та стільниці (термопласт, камінь, ДСП)
- Бюджет (загальний або вартість за 1 м²). Якщо клієнт каже нечітко ("недорого") — уточни діапазон
- Терміни виготовлення
- Додаткові побажання (колір, фурнітура, підсвічування, кількість полиць тощо)
- Локація: об'єкт у Києві чи в області? (потрібно для організації виїзду дизайнера)
- Номер телефону для зв'язку менеджера

ГОЛОВНЕ ПРАВИЛО — ГНУЧКІСТЬ:
- Якщо клієнт одразу пише деталі свого замовлення (розміри, матеріали, тип) — прийми цю інформацію, подякуй, і запитай те, чого не вистачає
- НЕ ігноруй те, що клієнт вже написав, і НЕ починай з початку свого "скрипта"
- Збирай інформацію природно в ході розмови, а не як анкету по пунктах
- Якщо клієнт надав багато деталей одразу — підтверди що ти все зафіксував і запитай лише те, чого бракує

НОМЕР ТЕЛЕФОНУ:
- Попроси номер телефону ОДИН РАЗ під час розмови, коли це буде доречно (наприклад, коли зібрав основну інформацію і треба передати менеджеру)
- Якщо клієнт відмовляється давати номер — скажи "Добре, тоді наш менеджер відповість вам тут у Direct" і продовжуй розмову. НЕ наполягай і НЕ повторюй прохання
- Якщо клієнт сам залишив номер — подякуй і продовжуй збирати решту інформації
- НІКОЛИ не блокуй розмову через відсутність номера телефону

СЦЕНАРІЙ:
1. Привітай клієнта коротко і тепло
2. Якщо клієнт вже написав деталі — прийми їх і запитай чого не вистачає
3. Якщо клієнт просто привітався — запитай що його цікавить
4. Послідовно збирай інформацію, яка ще не була надана
5. Для кухонь обов'язково уточни: чи до стелі, матеріали фасаду та стільниці окремо
6. Коли основна інформація зібрана — попроси номер телефону для менеджера
7. Коли всі параметри зібрані, підсумуй:
   "Дякую за інформацію! Все зафіксовано.
   Наш менеджер зв'яжеться з вами для уточнення деталей та розрахунку вартості.
   При потребі ми можемо організувати безкоштовний виїзд дизайнера для точних замірів 📲"

ПРО КОМПАНІЮ (використовуй коли доречно):
- Ми — компанія "Мебелька", спеціалізуємося на виготовленні меблів на замовлення
- Наш дизайнер може приїхати на об'єкт для точних замірів з усіма зразками матеріалів
- Це дозволяє врахувати нерівності стін/кутів та уникнути зазорів

НАШІ АДРЕСИ (якщо клієнт запитає):
- Правий берег: ТЦ "Будинок Меблів", бульвар Миколи Міхновського, 23 (район ст. метро "Звіринецька")
- Лівий берег: ТЦ "Ваш Дім", вул. Катерини Гандзюк, 2 (напроти 4-го входу в "Даринок", район ст. метро Лісова)
- Офіс: Харківське шосе 201/203

ВАЖЛИВО:
- Ніколи не називай конкретних цін та знижок — це робить менеджер
- Не домовляйся про конкретний час зустрічі — це робить менеджер
- Якщо клієнт запитує щось не пов'язане з меблями, ввічливо поверни розмову до теми
- Використовуй функцію extractOrderParams щоразу, коли клієнт повідомляє нові параметри`;

  constructor(
    private readonly prisma: PrismaService,
    private readonly qualificationService: QualificationService,
    private readonly chatGateway: ChatGateway,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy_string',
    });
  }

  /**
   * Check if AI should respond to this lead.
   * Returns false if manager is actively chatting or lead is closed.
   */
  async shouldRespond(leadId: number): Promise<boolean> {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return false;

    // Don't respond to closed/rejected leads
    if (lead.status === 'Zakryto' || lead.status === 'Vidhyleno') {
      this.logger.log(`Skipping AI for lead ${leadId}: status is ${lead.status}`);
      return false;
    }

    // Don't respond if manager sent a message in the last 30 minutes
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recentManagerMsg = await this.prisma.message.findFirst({
      where: {
        lead_id: leadId,
        role: 'manager',
        timestamp: { gte: thirtyMinAgo },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (recentManagerMsg) {
      this.logger.log(`Skipping AI for lead ${leadId}: manager active (last msg ${recentManagerMsg.timestamp.toISOString()})`);
      return false;
    }

    return true;
  }

  async processUserMessage(leadId: number, userText: string, attachmentNote?: string): Promise<string | null> {
    try {
      // Check if AI should respond
      if (!(await this.shouldRespond(leadId))) {
        return null;
      }

      // Build the user message content including attachment note
      const messageContent = attachmentNote
        ? `${userText || ''}\n${attachmentNote}`.trim()
        : userText;

      // Fetch last 15 messages for context (message already saved by instagram.service)
      const messages = await this.prisma.message.findMany({
        where: { lead_id: leadId },
        orderBy: { timestamp: 'desc' },
        take: 15,
      });

      const conversationHistory = messages.reverse().map(msg => ({
        role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg.text || '[вкладення]',
      }));

      // If attachmentNote, append it to the last user message in history
      if (attachmentNote && conversationHistory.length > 0) {
        const lastMsg = conversationHistory[conversationHistory.length - 1];
        if (lastMsg.role === 'user') {
          lastMsg.content = `${lastMsg.content}\n${attachmentNote}`.trim();
        }
      }

      // Use custom prompt from settings if available
      const customPrompt = await this.prisma.setting.findUnique({ where: { key: 'AI_SYSTEM_PROMPT' } });
      const systemPrompt = customPrompt?.value?.trim() || this.SYSTEM_PROMPT;

      const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
      ];

      // Call OpenAI with tool call loop (max 3 iterations to prevent infinite loops)
      let responseMessage = await this.callOpenAI(openAiMessages);

      for (let i = 0; i < 3 && responseMessage.tool_calls?.length; i++) {
        const toolResults: OpenAI.Chat.ChatCompletionMessageParam[] = [];

        for (const toolCall of responseMessage.tool_calls) {
          if (toolCall.type === 'function' && toolCall.function.name === 'extractOrderParams') {
            try {
              const params = JSON.parse(toolCall.function.arguments);
              await this.qualificationService.updateLeadParametersAndQualify(leadId, params);
              toolResults.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: 'Параметри збережено.',
              });
            } catch (parseErr) {
              this.logger.warn(`Failed to parse tool call args: ${toolCall.function.arguments}`);
              toolResults.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: 'Помилка обробки параметрів.',
              });
            }
          }
        }

        if (!toolResults.length) break;

        // Follow-up request with tool results
        openAiMessages.push(responseMessage, ...toolResults);
        responseMessage = await this.callOpenAI(openAiMessages);
      }

      const botReply = responseMessage.content;
      if (!botReply) {
        this.logger.warn(`OpenAI returned empty content for lead ${leadId} after tool call loop`);
        return null;
      }

      // Save bot message and emit via WebSocket
      const botMessage = await this.prisma.message.create({
        data: { text: botReply, sender_id: 'bot', role: 'bot', lead_id: leadId },
      });

      this.chatGateway.emitNewMessage(leadId, botMessage);
      return botReply;
    } catch (error) {
      this.logger.error(`Error in AI for lead ${leadId}:`, error);
      // Don't send error messages to customers — just log and return null
      return null;
    }
  }

  private async callOpenAI(messages: OpenAI.Chat.ChatCompletionMessageParam[]): Promise<OpenAI.Chat.ChatCompletionMessage> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools: [EXTRACT_ORDER_TOOL],
    });
    return completion.choices[0].message;
  }
}
