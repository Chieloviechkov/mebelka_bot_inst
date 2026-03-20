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

ПАРАМЕТРИ ДЛЯ ЗБОРУ (по одному питанню за раз):
1. Тип меблів (кухня, шафа, стіл, диван, комод, ліжко тощо)
2. Чи є проект або чорновий ескіз? Якщо є — попроси надіслати фото
3. Розміри (довжина, ширина, висота). Якщо кухня — чи плануєте до стелі?
4. Стиль (модерн, класика, мінімалізм, лофт тощо)
5. Матеріали фасаду (МДФ фарбований, ДСП, масив, шпон) та стільниці (термопласт, камінь, ДСП)
6. Бюджет (загальний або вартість за 1 м²). Якщо клієнт каже нечітко ("недорого") — уточни діапазон
7. Терміни виготовлення
8. Додаткові побажання (колір, фурнітура, підсвічування, кількість полиць тощо)
9. Локація: об'єкт у Києві чи в області? (потрібно для організації виїзду дизайнера)
10. Номер телефону: "Залиште, будь ласка, номер телефону, щоб наш менеджер міг з вами зв'язатися 📲"

СЦЕНАРІЙ:
1. Привітай: "Вітаю! 👋 Я — асистент з підбору меблів компанії Мебелька. Допоможу зібрати всю інформацію, щоб наші майстри підготували для вас найкращу пропозицію 🪑✨"
2. Запитай тип меблів
3. Запитай чи є проект/ескіз
4. Послідовно збирай решту параметрів
5. Якщо клієнт дає неповну інформацію — перепитай: "Чи правильно я розумію, що...?"
6. Для кухонь обов'язково уточни: чи до стелі, матеріали фасаду та стільниці окремо
7. Ближче до кінця попроси номер телефону: "Для того, щоб наш менеджер міг зв'язатися з вами та домовитися про зустріч з дизайнером, залиште, будь ласка, ваш номер телефону 📱"
8. Запитай локацію (Київ / область)
9. Коли всі параметри зібрані, підсумуй:
   "Дякуємо за інформацію! Ваша заявка збережена ✅
   Наш менеджер-спеціаліст зв'яжеться з вами найближчим часом для уточнення деталей.
   При потребі ми можемо організувати безкоштовний виїзд дизайнера для точних замірів та розрахунку вартості 📲
   Дякуємо, що обрали Мебельку! ❤️"

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
- Використовуй функцію extractOrderParams щоразу, коли клієнт повідомляє нові параметри
- Обов'язково збери номер телефону перед завершенням діалогу`;

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
                  phone: { type: 'string', description: 'Номер телефону клієнта' },
                  location: { type: 'string', description: 'Локація об\'єкта (Київ, область, назва міста)' },
                  has_project: { type: 'boolean', description: 'Чи є у клієнта проект або ескіз' },
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
