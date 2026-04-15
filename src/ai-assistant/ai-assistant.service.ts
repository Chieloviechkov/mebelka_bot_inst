import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { QualificationService } from '../qualification/qualification.service';
import { ChatGateway } from '../chat/chat.gateway';
import { DEFAULT_AI_PROMPT } from './default-prompt';

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

    // Per-chat AI toggle
    if (lead.ai_enabled === false) {
      this.logger.log(`Skipping AI for lead ${leadId}: ai_enabled=false`);
      return false;
    }

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

      // Збираємо системний промпт + few-shot приклади з налаштувань
      const settingsRows = await this.prisma.setting.findMany({
        where: { key: { in: ['AI_SYSTEM_PROMPT', 'AI_ASSERTIVENESS', 'AI_STYLE', 'AI_LANGUAGE', 'AI_OBJECTIONS', 'AI_TRAINING_EXAMPLES'] } },
      });
      const cfg: Record<string, string> = {};
      for (const r of settingsRows) cfg[r.key] = r.value;

      const systemPrompt = this.composeSystemPrompt(cfg);
      const fewShot = this.parseTrainingExamples(cfg.AI_TRAINING_EXAMPLES);

      const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...fewShot,
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
      await this.prisma.lead.update({ where: { id: leadId }, data: { updatedAt: new Date() } });

      this.chatGateway.emitNewMessage(leadId, botMessage);
      return botReply;
    } catch (error) {
      this.logger.error(`Error in AI for lead ${leadId}:`, error);
      // Don't send error messages to customers — just log and return null
      return null;
    }
  }

  private composeSystemPrompt(cfg: Record<string, string>): string {
    const base = cfg.AI_SYSTEM_PROMPT?.trim() || DEFAULT_AI_PROMPT;
    const parts: string[] = [base];

    const assertiveness = (cfg.AI_ASSERTIVENESS || '').toLowerCase();
    if (assertiveness === 'low') {
      parts.push('\nТОН: М\'який, ненав\'язливий. НЕ підштовхуй клієнта до рішення, давай йому час подумати. Не задавай уточнюючих питань підряд.');
    } else if (assertiveness === 'high') {
      parts.push('\nТОН: Активний, проактивний. Веди клієнта до закриття угоди — пропонуй наступний крок (зустріч, замір, передачу менеджеру) щойно зібрав мінімум інформації.');
    } else if (assertiveness === 'medium') {
      parts.push('\nТОН: Збалансований. Підтримуй темп розмови, але не тисни.');
    }

    const style = (cfg.AI_STYLE || '').toLowerCase();
    if (style === 'formal') {
      parts.push('\nСТИЛЬ: Офіційний. Звертайся на "Ви", без жаргону та емодзі. Структурована мова.');
    } else if (style === 'casual') {
      parts.push('\nСТИЛЬ: Невимушений. Можна "Ви" або "ти" за контекстом, легкі емодзі доречні (1-2 на повідомлення максимум).');
    } else if (style === 'friendly') {
      parts.push('\nСТИЛЬ: Дружній. "Ви", тепло, людяно. Емодзі рідко (тільки 📲 / ✅).');
    }

    const lang = (cfg.AI_LANGUAGE || '').toLowerCase();
    if (lang === 'ru') {
      parts.push('\nМОВА ВІДПОВІДЕЙ: Російська. Усі повідомлення клієнту — російською мовою, незалежно від мови запиту.');
    } else if (lang === 'en') {
      parts.push('\nLANGUAGE: English. Reply to the customer only in English regardless of input language.');
    } else if (lang === 'auto') {
      parts.push('\nМОВА: Відповідай тією мовою, якою пише клієнт (українська/російська).');
    }
    // default = укр (вже у базовому промпті)

    const objections = this.parseObjections(cfg.AI_OBJECTIONS);
    if (objections.length) {
      const lines = objections.map((o, i) => `${i + 1}. Заперечення: "${o.objection}"\n   Відповідь: ${o.response}`).join('\n');
      parts.push(`\nРОБОТА З ЗАПЕРЕЧЕННЯМИ:\nКоли клієнт висловлює одне з наведених нижче заперечень — використовуй вказану відповідь як основу (можеш переформулювати під контекст, але зберігай суть):\n${lines}`);
    }

    return parts.join('\n');
  }

  private parseObjections(raw?: string): Array<{ objection: string; response: string }> {
    if (!raw?.trim()) return [];
    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.filter(x => x?.objection && x?.response);
    } catch {
      return [];
    }
  }

  private parseTrainingExamples(raw?: string): OpenAI.Chat.ChatCompletionMessageParam[] {
    if (!raw?.trim()) return [];
    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      const result: OpenAI.Chat.ChatCompletionMessageParam[] = [];
      for (const ex of arr) {
        if (ex?.user) result.push({ role: 'user', content: String(ex.user) });
        if (ex?.assistant) result.push({ role: 'assistant', content: String(ex.assistant) });
      }
      return result;
    } catch {
      return [];
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
