const aiAssistantService = require('../services/aiAssistantService');

/**
 * AI Rental Assistant Controller
 */

exports.handleChat = async (req, res) => {
  try {
    const { message, history = [], currentFilters = {} } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required and cannot be empty.',
      });
    }

    const result = await aiAssistantService.processAssistantChat({
      message: message.trim(),
      history,
      currentFilters,
    });

    return res.json({
      success: true,
      intent: result.intent,
      reply: result.reply,
      filters: result.filters,
      listings: result.listings,
      isRelaxed: result.isRelaxed,
      provider: result.provider,
    });
  } catch (err) {
    console.error('❌ [AssistantController] handleChat Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to process AI assistant request.',
      error: err.message,
    });
  }
};

exports.getSuggestions = (_req, res) => {
  const suggestions = [
    { label: '2-bed in Mirpur under 20k', query: '2-bed flat under 20k in Mirpur' },
    { label: 'Dhanmondi with parking', query: 'Apartments in Dhanmondi with parking and lift' },
    { label: 'Affordable flat under 15k', query: 'Affordable flat or bachelor room under 15k' },
    { label: 'Family home in Uttara', query: '3-bed family apartment in Uttara with balcony' },
    { label: 'Gulshan / Banani luxury', query: 'Modern apartment in Gulshan or Banani with generator & security' },
  ];

  return res.json({ success: true, suggestions });
};

exports.getStatus = (_req, res) => {
  const configuredProviders = [];
  if (process.env.GEMINI_API_KEY?.trim()) configuredProviders.push('Google Gemini (Primary)');
  if (process.env.GEMINI_API_KEY_BACKUP?.trim()) configuredProviders.push('Google Gemini (Backup)');
  if (process.env.GROQ_API_KEY?.trim()) configuredProviders.push('Groq (Llama-3)');
  if (process.env.OPENROUTER_API_KEY?.trim()) configuredProviders.push('OpenRouter');
  if (process.env.OPENAI_API_KEY?.trim()) configuredProviders.push('OpenAI');

  const hasAnyKey = configuredProviders.length > 0;

  return res.json({
    success: true,
    hasConfiguredKey: hasAnyKey,
    activeProviders: hasAnyKey ? configuredProviders : ['Local Rule Engine (Zero-Crash Fallback)'],
    fallbackNotice: !hasAnyKey
      ? 'To enable full LLM intelligence, paste your GEMINI_API_KEY in server/.env'
      : null,
  });
};
