const Listing = require('../models/Listing');

const RENTAL_TERMS = [
  'rent', 'rental', 'property', 'properties', 'listing', 'listings', 'flat',
  'apartment', 'house', 'home', 'room', 'bedroom', 'bhk', 'tenant', 'landlord',
  'lease', 'bachelor', 'sublet', 'neighborhood', 'area', 'location', 'budget',
  'price', 'parking', 'balcony', 'generator', 'lift', 'furnished', 'available',
  'availability', 'booking', 'move', 'mirpur', 'dhanmondi', 'gulshan', 'banani',
  'uttara', 'bashundhara', 'mohammadpur', 'badda', 'mohakhali', 'lalmatia',
  'rampura', 'malibagh', 'baridhara', 'khilkhet', 'farmgate', 'motijheel',
  'azimpur', 'shyamoli',
];

const RENTAL_GREETING = /^(hi|hello|hey|assalamu alaikum|salam|good morning|good afternoon|good evening)[!.\s]*$/i;

function isRentalRelated(message, currentFilters = {}) {
  if (Object.values(currentFilters).some((value) => {
    return value !== null && value !== undefined && (Array.isArray(value) ? value.length > 0 : value !== '');
  })) {
    return true;
  }

  const normalized = message.toLowerCase();
  return !RENTAL_GREETING.test(normalized) && RENTAL_TERMS.some((term) => {
    return new RegExp(`\\b${term}\\b`, 'i').test(normalized);
  });
}

/**
 * Multi-Provider LLM & Grounded Search Service
 * Cascades through configured providers:
 * 1. Google Gemini (GEMINI_API_KEY)
 * 2. Secondary Gemini (GEMINI_API_KEY_BACKUP)
 * 3. Groq (GROQ_API_KEY)
 * 4. OpenRouter (OPENROUTER_API_KEY)
 * 5. OpenAI (OPENAI_API_KEY)
 * 6. Built-in Rule-Based Fallback Engine (zero-crash guarantee)
 */

// ── Multi-Provider Caller with Auto-Failover ──────────────────────────────────
async function callLlm({ systemInstruction, prompt, jsonMode = false }) {
  const providers = [];

  if (process.env.GEMINI_API_KEY?.trim()) {
    providers.push({
      name: 'Google Gemini (Primary)',
      type: 'gemini',
      apiKey: process.env.GEMINI_API_KEY.trim(),
      model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    });
  }

  if (process.env.GEMINI_API_KEY_BACKUP?.trim()) {
    providers.push({
      name: 'Google Gemini (Backup)',
      type: 'gemini',
      apiKey: process.env.GEMINI_API_KEY_BACKUP.trim(),
      model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    });
  }

  if (process.env.GROQ_API_KEY?.trim()) {
    providers.push({
      name: 'Groq (Llama-3)',
      type: 'openai_compatible',
      baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: process.env.GROQ_API_KEY.trim(),
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    });
  }

  if (process.env.OPENROUTER_API_KEY?.trim()) {
    providers.push({
      name: 'OpenRouter',
      type: 'openai_compatible',
      baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: process.env.OPENROUTER_API_KEY.trim(),
      model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
    });
  }

  if (process.env.OPENAI_API_KEY?.trim()) {
    providers.push({
      name: 'OpenAI (GPT-4o-mini)',
      type: 'openai_compatible',
      baseUrl: 'https://api.openai.com/v1/chat/completions',
      apiKey: process.env.OPENAI_API_KEY.trim(),
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    });
  }

  // Iterate over providers in order
  for (const provider of providers) {
    try {
      if (provider.type === 'gemini') {
        const result = await callGemini({
          apiKey: provider.apiKey,
          model: provider.model,
          systemInstruction,
          prompt,
          jsonMode,
        });
        if (result) return { text: result, provider: provider.name };
      } else if (provider.type === 'openai_compatible') {
        const result = await callOpenAiCompatible({
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          model: provider.model,
          systemInstruction,
          prompt,
          jsonMode,
        });
        if (result) return { text: result, provider: provider.name };
      }
    } catch (err) {
      console.warn(`⚠️ [AI Assistant] Provider "${provider.name}" failed:`, err.message || err);
      // Auto-failover to next provider in the cascade
    }
  }

  // No provider succeeded or none configured
  return null;
}

// ── Google Gemini Provider ───────────────────────────────────────────────────
async function callGemini({ apiKey, model, systemInstruction, prompt, jsonMode }) {
  try {
    // Try using installed @google/generative-ai first
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelInstance = genAI.getGenerativeModel({
      model: model || 'gemini-3.6-flash',
      systemInstruction: systemInstruction || undefined,
      generationConfig: jsonMode ? { responseMimeType: 'application/json' } : undefined,
    });

    const resp = await modelInstance.generateContent(prompt);
    return resp.response.text();
  } catch (sdkErr) {
    // Fallback to direct Gemini REST API if SDK has any environment issue
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-3.6-flash'}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ role: 'user', parts: [{ text: `${systemInstruction ? `[System: ${systemInstruction}]\n\n` : ''}${prompt}` }] }],
      generationConfig: jsonMode ? { responseMimeType: 'application/json' } : {},
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  }
}

// ── OpenAI-Compatible Provider (Groq, OpenRouter, OpenAI) ─────────────────────
async function callOpenAiCompatible({ baseUrl, apiKey, model, systemInstruction, prompt, jsonMode }) {
  const messages = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const payload = {
    model,
    messages,
    temperature: 0.2,
  };

  if (jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

// ── Stage 1: Natural Language Query Parser ───────────────────────────────────
async function parseNaturalLanguageQuery(userMessage, conversationHistory = [], currentFilters = {}) {
  const systemPrompt = `You are a specialized rental query filter parser for RentEase, a property rental platform operating in Dhaka, Bangladesh.
Your mission is to parse the user's message and ongoing conversation into a precise, structured JSON search filter object.

SUPPORTED LOCATIONS IN DHAKA include but are not limited to: Mirpur (Mirpur 1, 2, 10, 11, 12, DOHS), Dhanmondi, Gulshan, Banani, Uttara, Bashundhara, Mohammadpur, Badda, Mohakhali, Lalmatia, Rampura, Malibagh, Baridhara, etc.

SCHEMA TO OUTPUT (ONLY raw JSON, no markdown, no explanation):
{
  "location": string | null,        // Clean location or neighborhood name (e.g. "Mirpur", "Dhanmondi")
  "minPrice": number | null,        // Minimum monthly rent in BDT
  "maxPrice": number | null,        // Maximum monthly rent in BDT (e.g. "20k" = 20000, "15 thousand" = 15000)
  "bedrooms": number | null,        // Integer number of bedrooms/beds requested (e.g. 1, 2, 3)
  "amenities": string[],            // Standardized amenities e.g. ["wifi", "parking", "balcony", "generator", "lift", "gas", "ac", "security"]
  "keywords": string[],             // Other key descriptors e.g. ["family", "bachelor", "sublet", "duplex", "studio"]
  "isFollowUpRefinement": boolean   // TRUE if this message refines or updates previous search, FALSE if starting a completely new query
}

MULTI-TURN CONTEXT RULES:
- If current active filters exist and the user says something like "under 20k", "only show with parking", "what about Dhanmondi instead?", retain previous non-conflicting criteria and update the modified field.
- If the user asks for a completely unrelated area or starts over ("start new search", "reset"), set isFollowUpRefinement to false.
- Convert all shorthand budget numbers accurately: "20k" = 20000, "25000 BDT" = 25000, "under 15 thousand" = maxPrice: 15000.`;

  const prompt = `Current Active Filters:
${JSON.stringify(currentFilters, null, 2)}

Recent Conversation History:
${conversationHistory
  .slice(-4)
  .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
  .join('\n')}

Latest User Message:
"${userMessage}"

Respond with ONLY the JSON object conforming to the schema.`;

  const llmResult = await callLlm({
    systemInstruction: systemPrompt,
    prompt,
    jsonMode: true,
  });

  if (llmResult?.text) {
    try {
      // Clean possible markdown code fences if provider didn't honor raw json
      const cleaned = llmResult.text.replace(/```json\n?|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      // Merge with previous filters if this was a refinement
      if (parsed.isFollowUpRefinement && currentFilters && Object.keys(currentFilters).length > 0) {
        return {
          location: parsed.location !== null ? parsed.location : currentFilters.location || null,
          minPrice: parsed.minPrice !== null ? parsed.minPrice : currentFilters.minPrice || null,
          maxPrice: parsed.maxPrice !== null ? parsed.maxPrice : currentFilters.maxPrice || null,
          bedrooms: parsed.bedrooms !== null ? parsed.bedrooms : currentFilters.bedrooms || null,
          amenities: Array.from(new Set([...(currentFilters.amenities || []), ...(parsed.amenities || [])])),
          keywords: Array.from(new Set([...(currentFilters.keywords || []), ...(parsed.keywords || [])])),
          _provider: llmResult.provider,
        };
      }

      return { ...parsed, _provider: llmResult.provider };
    } catch (parseErr) {
      console.warn('⚠️ [AI Assistant] Failed to parse LLM JSON output, falling back to rule parser:', parseErr.message);
    }
  }

  // Fallback rule-based extractor
  return ruleBasedFilterExtractor(userMessage, currentFilters);
}

// ── Smart Rule-Based Fallback Extractor (Zero-Crash Guarantee) ────────────────
function ruleBasedFilterExtractor(text, currentFilters = {}) {
  const lower = text.toLowerCase();
  const filters = {
    location: currentFilters.location || null,
    minPrice: currentFilters.minPrice || null,
    maxPrice: currentFilters.maxPrice || null,
    bedrooms: currentFilters.bedrooms || null,
    amenities: [...(currentFilters.amenities || [])],
    keywords: [...(currentFilters.keywords || [])],
    _provider: 'Local Rule Engine (Provider unavailable or no API key)',
  };

  // Location detection in Dhaka
  const locations = [
    'mirpur', 'dhanmondi', 'gulshan', 'banani', 'uttara', 'bashundhara',
    'mohammadpur', 'badda', 'mohakhali', 'lalmatia', 'rampura', 'malibagh',
    'baridhara', 'khilkhet', 'farmgate', 'motijheel', 'azimpur', 'shyamoli',
  ];
  for (const loc of locations) {
    if (lower.includes(loc)) {
      filters.location = loc.charAt(0).toUpperCase() + loc.slice(1);
      break;
    }
  }

  // Price detection (e.g. "under 20k", "below 20000", "max 25k", "under 20000 bdt")
  const maxPriceMatch = lower.match(/(?:under|below|max|upto|within|less than)\s*([0-9]+(?:\.[0-9]+)?)\s*(k|thousand)?/i);
  if (maxPriceMatch) {
    let val = parseFloat(maxPriceMatch[1]);
    if (maxPriceMatch[2]?.toLowerCase() === 'k' || maxPriceMatch[2]?.toLowerCase() === 'thousand') {
      val *= 1000;
    } else if (val < 100) {
      val *= 1000; // e.g. "under 20" means 20k
    }
    filters.maxPrice = Math.round(val);
  }

  // Bedroom detection (e.g. "2 bed", "3 bedroom", "2-bed", "1 bhk")
  const bedMatch = lower.match(/([1-9])\s*(?:-| )?\s*(?:bed|bedroom|bhk|room)/i);
  if (bedMatch) {
    filters.bedrooms = parseInt(bedMatch[1], 10);
  }

  // Amenities detection
  const commonAmenities = ['wifi', 'parking', 'balcony', 'generator', 'lift', 'elevator', 'gas', 'ac', 'security', 'cctv'];
  for (const a of commonAmenities) {
    if (lower.includes(a)) {
      const normalized = a === 'elevator' ? 'lift' : a;
      if (!filters.amenities.includes(normalized)) {
        filters.amenities.push(normalized);
      }
    }
  }

  // Keywords
  const descriptors = ['family', 'bachelor', 'sublet', 'studio', 'flat', 'apartment'];
  for (const d of descriptors) {
    if (lower.includes(d) && !filters.keywords.includes(d)) {
      filters.keywords.push(d);
    }
  }

  return filters;
}

// ── Stage 2: Real Database Query Execution ────────────────────────────────────
async function executeDatabaseQuery(filters) {
  // Base condition: only show verified & approved listings to tenants
  const mongoQuery = { status: 'approved' };

  // Location filter (regex match on location or title)
  if (filters.location && typeof filters.location === 'string' && filters.location.trim()) {
    mongoQuery.$or = [
      { location: { $regex: filters.location.trim(), $options: 'i' } },
      { title: { $regex: filters.location.trim(), $options: 'i' } },
    ];
  }

  // Price range filter
  if ((filters.minPrice !== null && filters.minPrice !== undefined) || (filters.maxPrice !== null && filters.maxPrice !== undefined)) {
    mongoQuery.price = {};
    if (filters.minPrice) mongoQuery.price.$gte = Number(filters.minPrice);
    if (filters.maxPrice) mongoQuery.price.$lte = Number(filters.maxPrice);
  }

  // Amenities filter: Match any of the requested amenities
  if (filters.amenities && filters.amenities.length > 0) {
    const amenityRegexes = filters.amenities.map((a) => new RegExp(a, 'i'));
    const amenityConditions = [
      { amenities: { $in: amenityRegexes } },
      { description: { $regex: filters.amenities.join('|'), $options: 'i' } },
    ];
    if (mongoQuery.$or) {
      mongoQuery.$and = [{ $or: mongoQuery.$or }, { $or: amenityConditions }];
      delete mongoQuery.$or;
    } else {
      mongoQuery.$or = amenityConditions;
    }
  }

  // Execute database query with sorting by newest first
  let listings = await Listing.find(mongoQuery)
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // If bedrooms were requested, refine results by checking title and description
  if (filters.bedrooms && listings.length > 0) {
    const bedNum = filters.bedrooms;
    const bedRegex = new RegExp(`(?:\\b${bedNum}\\s*(?:-| )?\\s*(?:bed|bedroom|bhk)|\\b${bedNum}b\\b)`, 'i');
    const matchedWithBed = listings.filter((l) => bedRegex.test(l.title) || bedRegex.test(l.description));
    if (matchedWithBed.length > 0) {
      listings = matchedWithBed;
    }
  }

  // If strict query yields 0 results, check if relaxed query (e.g. location only) finds anything
  let relaxedResults = [];
  if (listings.length === 0 && filters.location) {
    relaxedResults = await Listing.find({
      status: 'approved',
      $or: [
        { location: { $regex: filters.location.trim(), $options: 'i' } },
        { title: { $regex: filters.location.trim(), $options: 'i' } },
      ],
    })
      .sort({ price: 1 })
      .limit(3)
      .lean();
  }

  return { listings, relaxedResults };
}

// ── Stage 3: Grounded LLM Response Generator (Anti-Hallucination Guardrails) ──
async function generateGroundedResponse({
  userMessage,
  conversationHistory = [],
  filters,
  listings,
  relaxedResults = [],
}) {
  const listingSummaries = listings.map((l, idx) => ({
    index: idx + 1,
    id: l._id,
    title: l.title,
    location: l.location,
    rent_bdt: l.price,
    amenities: l.amenities || [],
    description: l.description,
  }));

  const relaxedSummaries = relaxedResults.map((l, idx) => ({
    index: idx + 1,
    id: l._id,
    title: l.title,
    location: l.location,
    rent_bdt: l.price,
    amenities: l.amenities || [],
  }));

  const systemInstruction = `You are RentEase's Grounded AI Rental Concierge in Dhaka, Bangladesh.
You help prospective tenants find real, verified rental properties.

CRITICAL ANTI-HALLUCINATION GUARDRAILS (STRICT COMPLIANCE REQUIRED):
1. You MUST ONLY describe, mention, or recommend properties that appear in the "VERIFIED_DATABASE_RESULTS" section below.
2. NEVER invent, fabricate, imagine, or assume any property, address, landlord name, phone number, or rent price not present in VERIFIED_DATABASE_RESULTS.
3. If VERIFIED_DATABASE_RESULTS is empty:
   - Clearly and politely explain that no approved listings were found matching their exact criteria.
   - Summarize the specific filters searched (e.g. Location: ${filters.location || 'Any'}, Max Budget: ${filters.maxPrice ? filters.maxPrice + ' BDT' : 'Any'}).
   ${
     relaxedSummaries.length > 0
       ? `- Inform the user about the alternative properties in "${filters.location}" provided in ALTERNATIVE_RESULTS with their actual prices.`
       : `- Suggest realistic tweaks, such as checking adjacent neighborhoods or adjusting their budget.`
   }
4. Format your output in clean, welcoming markdown with bullet points for each property mentioning:
   - Property Title & Location
   - Monthly Rent in BDT (e.g. BDT 18,000/month)
   - Notable highlights/amenities
5. Keep your answer conversational, helpful, and concise.`;

  const prompt = `User's Query: "${userMessage}"

Parsed Search Filters:
${JSON.stringify(filters, null, 2)}

VERIFIED_DATABASE_RESULTS (${listings.length} properties found):
${JSON.stringify(listingSummaries, null, 2)}

${
  relaxedSummaries.length > 0
    ? `ALTERNATIVE_RESULTS (Near location with different price):
${JSON.stringify(relaxedSummaries, null, 2)}`
    : ''
}

Conversation History:
${conversationHistory
  .slice(-4)
  .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
  .join('\n')}

Generate your grounded response to the tenant:`;

  const llmResult = await callLlm({
    systemInstruction,
    prompt,
    jsonMode: false,
  });

  if (llmResult?.text) {
    return {
      reply: llmResult.text.trim(),
      provider: llmResult.provider,
    };
  }

  // Fallback template response if no LLM key or provider failed
  return {
    reply: formatRuleBasedResponse(listings, filters, relaxedResults),
    provider: 'Local Rule Engine (Provider unavailable or no API key)',
  };
}

// ── Rule-Based Response Formatter (Zero-Crash Fallback) ───────────────────────
function formatRuleBasedResponse(listings, filters, relaxedResults = []) {
  if (listings.length > 0) {
    let text = `I found **${listings.length} verified propert${listings.length === 1 ? 'y' : 'ies'}** matching your criteria`;
    if (filters.location) text += ` in **${filters.location}**`;
    if (filters.maxPrice) text += ` under **BDT ${filters.maxPrice.toLocaleString()}**`;
    if (filters.bedrooms) text += ` with **${filters.bedrooms} bedroom(s)**`;
    text += ':\n\n';

    listings.forEach((item, i) => {
      text += `${i + 1}. **${item.title}**\n`;
      text += `   - 📍 **Location:** ${item.location}\n`;
      text += `   - 💰 **Rent:** BDT ${item.price?.toLocaleString()}/month\n`;
      if (item.amenities?.length) {
        text += `   - ✨ **Amenities:** ${item.amenities.join(', ')}\n`;
      }
      text += '\n';
    });

    text += 'You can click on any property card below to check availability or submit a booking request directly!';
    return text;
  }

  // 0 matches
  let noMatchText = "I couldn't find any approved rental properties";
  if (filters.location) noMatchText += ` in **${filters.location}**`;
  if (filters.maxPrice) noMatchText += ` under **BDT ${filters.maxPrice.toLocaleString()}**`;
  noMatchText += ' in our database.\n\n';

  if (relaxedResults.length > 0) {
    noMatchText += `However, here are other available properties in **${filters.location}**:\n\n`;
    relaxedResults.forEach((item, i) => {
      noMatchText += `${i + 1}. **${item.title}** — 📍 ${item.location} | 💰 BDT ${item.price?.toLocaleString()}/mo\n`;
    });
    noMatchText += '\nWould you like to adjust your budget or explore a neighboring area?';
  } else {
    noMatchText += '💡 **Tip:** Try broadening your search location (e.g. nearby sectors or areas) or adjusting your budget range.';
  }

  return noMatchText;
}

// ── Main Public Pipeline Method ───────────────────────────────────────────────
async function processAssistantChat({ message, history = [], currentFilters = {} }) {
  if (!isRentalRelated(message, currentFilters)) {
    return {
      reply: "I'm RentEase's rental assistant. I can help you find verified rental properties, compare areas, budgets, bedrooms, amenities, and availability. What kind of property are you looking for?",
      filters: currentFilters,
      listings: [],
      isRelaxed: false,
      provider: 'Rental Scope Guard',
    };
  }

  // Step 1: Parse natural language into structured filters
  const parsedFilters = await parseNaturalLanguageQuery(message, history, currentFilters);

  // Step 2: Execute real query against database
  const { listings, relaxedResults } = await executeDatabaseQuery(parsedFilters);

  // Step 3: Grounded response generation with anti-hallucination guardrails
  const { reply, provider } = await generateGroundedResponse({
    userMessage: message,
    conversationHistory: history,
    filters: parsedFilters,
    listings,
    relaxedResults,
  });

  return {
    reply,
    filters: parsedFilters,
    listings: listings.length > 0 ? listings : relaxedResults,
    isRelaxed: listings.length === 0 && relaxedResults.length > 0,
    provider,
  };
}

module.exports = {
  processAssistantChat,
  parseNaturalLanguageQuery,
  executeDatabaseQuery,
  generateGroundedResponse,
};
