const Listing = require('../models/Listing');

const OUT_OF_SCOPE_REPLY =
  "I am not supposed to talk about these things. I am RentEase's AI assistant, and I can only help you with property listings, rental searches, apartment details, pricing, rental agreements, maintenance requests, and other rental services in Dhaka. Please let me know how I can help you with your property search!";

const GREETING_REPLY =
  "👋 Hello! I'm your RentEase AI assistant. I can help you find verified rental properties in Dhaka, compare rents across neighborhoods, check amenities (like lift, generator, or parking), or answer questions about rental agreements and tenancy. What kind of property or flat are you looking for?";

// ── Out-of-Scope Detection Keywords & Regex Patterns (Rule Engine) ───────────
const OUT_OF_SCOPE_PATTERNS = [
  // War, military, weapons, conflicts
  /\b(war|wars|warfare|battle|battles|military|weapon|weapons|gun|guns|missile|missiles|bomb|bombs|nuclear|army|armies|soldier|soldiers|invasion|invade|troops|pentagon|combat|nato|russia|ukraine|putin|zelensky|israel|gaza|palestine|hamas|syria|iran|iraq)\b/i,
  // Politics, elections, world leaders
  /\b(politics|political|politician|election|elections|vote|voting|president|prime minister|minister|parliament|senate|congress|democrat|republican|biden|trump|kamala|hasina|khaleda|awami|bnp|modi)\b/i,
  // General programming, coding, non-RentEase tech
  /\b(python|javascript|typescript|c\+\+|java|csharp|golang|rust|php|html|css|sql|react|vue|angular|docker|kubernetes|algorithm|quicksort|binary search|recursion|debug this|write a code|write code|write a function|write a script|github repo)\b/i,
  // Science, math, physics, astronomy
  /\b(quantum|physics|chemistry|biology|photosynthesis|gravity|relativity|calculus|algebra|equation|astronomy|black hole|galaxy|universe|solar system|mars|planet)\b/i,
  // Entertainment, cinema, sports, celebrities
  /\b(movie|movies|cinema|hollywood|bollywood|actor|actress|singer|song|album|lyrics|cricket|football|soccer|world cup|fifa|ipl|bpl|messi|ronaldo|tennis|nba|gaming|playstation|xbox)\b/i,
  // Food recipes & cooking instructions
  /\b(recipe|recipes|how to cook|how to bake|how to make biryani|pizza recipe|burger recipe|ingredients for)\b/i,
  // General trivia & non-rental curiosities
  /\b(capital of|who invented|who discovered|who wrote|tell me a joke|tell a joke|write a poem|write a story|meaning of life|philosophy|horoscope|astrology)\b/i,
  // Medical & health diagnosis
  /\b(symptoms of|cure for|diagnose|prescription|medical treatment|disease)\b/i,
];

// ── Dhaka Neighborhoods & Rental Keywords ────────────────────────────────────
const DHAKA_LOCATIONS = [
  'mirpur', 'dhanmondi', 'gulshan', 'banani', 'uttara', 'bashundhara',
  'mohammadpur', 'badda', 'mohakhali', 'lalmatia', 'rampura', 'malibagh',
  'baridhara', 'khilkhet', 'farmgate', 'motijheel', 'azimpur', 'shyamoli',
  'niketan', 'aftabnagar', 'panthapath', 'tejgong', 'cantonment', 'dohs',
];

const RENTAL_KEYWORDS = [
  'rent', 'rental', 'property', 'properties', 'listing', 'listings', 'flat',
  'apartment', 'house', 'home', 'room', 'bedroom', 'bed', 'bhk', 'tenant', 'landlord',
  'lease', 'bachelor', 'sublet', 'neighborhood', 'area', 'location', 'budget',
  'price', 'parking', 'balcony', 'generator', 'lift', 'furnished', 'available',
  'availability', 'booking', 'agreement', 'advance', 'deposit', 'maintenance',
  'duplex', 'studio', 'bachelor flat', 'family flat',
];

const GREETING_REGEX = /^(hi|hello|hey|assalamu alaikum|salam|good morning|good afternoon|good evening|how are you|who are you)[!.\s]*$/i;

// ── Dhaka Rental Knowledge Base (For Informational Questions) ─────────────────
const RENTAL_FAQ_KNOWLEDGE = [
  {
    keywords: ['advance', 'deposit', 'security deposit', 'advance rent'],
    answer:
      "💡 **Advance Rent & Security Deposits in Dhaka:**\n\n" +
      "- **Standard Practice:** Most landlords in Dhaka typically request **1 to 2 months' rent** as an advance security deposit.\n" +
      "- **Adjustment vs Refund:** This deposit is usually adjusted against your last months of tenancy or refunded upon moving out after inspecting for damages.\n" +
      "- **RentEase Tip:** Always ensure the exact advance amount and terms of refund/adjustment are clearly stipulated in your digital **Rental Agreement** on RentEase before making payments.",
  },
  {
    keywords: ['agreement', 'contract', 'lease', 'sign', 'stamp', 'legal'],
    answer:
      "📄 **Rental Agreements on RentEase:**\n\n" +
      "- **3-Stage Workflow:** RentEase features a verified rental agreement approval workflow:\n" +
      "  1. **Landlord Draft:** The landlord creates the agreement with monthly rent, advance deposit, and rules.\n" +
      "  2. **Tenant Review & Passkey:** The tenant reviews the terms and claims the lease using a secure verification passkey.\n" +
      "  3. **Digital Execution & PDF:** A legally formatted rental agreement PDF is generated with unique reference codes for both parties.\n" +
      "- **Standard Clauses:** Notice period (usually 1–2 months), utility bills payment, subletting restrictions, and maintenance responsibilities are clearly defined.",
  },
  {
    keywords: ['stripe', 'pay rent', 'payment', 'card', 'partial payment'],
    answer:
      "💳 **Paying Rent on RentEase via Stripe:**\n\n" +
      "- **Online & Secure:** Tenants can pay monthly rent directly through the **Stripe Checkout Gateway** supporting debit/credit cards.\n" +
      "- **Partial Payments:** If you cannot pay the full rent at once, RentEase allows you to specify a partial amount; your payment status updates to `partial` with the remaining balance clearly tracked.\n" +
      "- **Instant Receipts:** Once paid, an automated PDF rent receipt is generated and your payment ledger updates in real-time.",
  },
  {
    keywords: ['maintenance', 'complaint', 'repair', 'broken', 'leak', 'plumbing'],
    answer:
      "🛠️ **Maintenance & Repair Requests on RentEase:**\n\n" +
      "- Tenants can submit maintenance requests directly from the **Maintenance Tracker** in their dashboard.\n" +
      "- You can categorize issues (plumbing, electrical, appliance, structural) and attach photos.\n" +
      "- Landlords and administrators receive instant notifications and can assign contractors or update repair statuses from `pending` to `in-progress` and `resolved`.",
  },
  {
    keywords: ['bachelor', 'family', 'student', 'mess'],
    answer:
      "🏠 **Bachelor vs Family Rentals in Dhaka:**\n\n" +
      "- **Bachelor/Student Housing:** Popular budget areas for bachelors and university students include **Mirpur, Farmgate, Azimpur (near DU/BUET), and Bashundhara (near NSU/IUB)**. Look for listings tagged `bachelor` or `sublet`.\n" +
      "- **Family Apartments:** Areas like **Dhanmondi, Uttara, Mirpur DOHS, and Bashundhara** are preferred for families seeking quiet residential environments, security, and schools.\n" +
      "- RentEase lets you filter properties specifically by bachelor-friendly or family-oriented tags.",
  },
  {
    keywords: ['area', 'neighborhood', 'best location', 'where to live'],
    answer:
      "📍 **Top Rental Neighborhoods in Dhaka:**\n\n" +
      "- **Mirpur:** Most affordable, excellent metro rail connectivity, vibrant local markets (Rent: BDT 12k–28k).\n" +
      "- **Uttara:** Planned sectors, peaceful, close to airport and metro rail stations (Rent: BDT 18k–40k).\n" +
      "- **Dhanmondi:** Central, prestigious, filled with schools, hospitals, and restaurants (Rent: BDT 25k–60k).\n" +
      "- **Gulshan & Banani:** Premium high-end luxury residences, top security, continuous generator/water backup (Rent: BDT 45k–150k+).\n" +
      "- **Bashundhara R/A:** Clean, wide roads, ideal for university students and corporate professionals (Rent: BDT 18k–45k).",
  },
];

// ── Multi-Provider Caller with Auto-Failover ──────────────────────────────────
async function callLlm({ systemInstruction, prompt, jsonMode = false }) {
  const providers = [];

  // Cascade through Gemini models (3.5-flash -> 3.1-flash-lite -> 3.6-flash)
  if (process.env.GEMINI_API_KEY?.trim()) {
    const key = process.env.GEMINI_API_KEY.trim();
    const geminiModels = [
      process.env.GEMINI_MODEL || 'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.6-flash',
    ];
    for (const m of geminiModels) {
      providers.push({
        name: `Google Gemini (${m})`,
        type: 'gemini',
        apiKey: key,
        model: m,
      });
    }
  }

  if (process.env.GEMINI_API_KEY_BACKUP?.trim()) {
    providers.push({
      name: 'Google Gemini (Backup)',
      type: 'gemini',
      apiKey: process.env.GEMINI_API_KEY_BACKUP.trim(),
      model: 'gemini-3.5-flash',
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
      // Auto-failover to next provider/model in cascade
    }
  }

  return null;
}

// ── Google Gemini Provider ───────────────────────────────────────────────────
async function callGemini({ apiKey, model, systemInstruction, prompt, jsonMode }) {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelInstance = genAI.getGenerativeModel({
      model: model || 'gemini-3.5-flash',
      systemInstruction: systemInstruction || undefined,
      generationConfig: jsonMode ? { responseMimeType: 'application/json' } : undefined,
    });

    const resp = await modelInstance.generateContent(prompt);
    return resp.response.text();
  } catch (sdkErr) {
    // Fallback to direct Gemini REST API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-3.5-flash'}:generateContent?key=${apiKey}`;
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

// ── Stage 1: Intent Classification & Query Parser ────────────────────────────
async function classifyAndParseQuery(userMessage, conversationHistory = [], currentFilters = {}) {
  // Quick pre-check: If message is obviously out of scope, reject immediately
  const lowerMsg = userMessage.toLowerCase().trim();

  // If matches an explicit out-of-scope regex AND does not contain a property keyword
  const hasRentalKeyword = RENTAL_KEYWORDS.some((kw) => new RegExp(`\\b${kw}\\b`, 'i').test(lowerMsg));
  const hasLocation = DHAKA_LOCATIONS.some((loc) => new RegExp(`\\b${loc}\\b`, 'i').test(lowerMsg));
  const isExplicitlyOutOfScope = OUT_OF_SCOPE_PATTERNS.some((pattern) => pattern.test(lowerMsg));

  if (isExplicitlyOutOfScope && !hasRentalKeyword && !hasLocation) {
    return {
      intent: 'OUT_OF_SCOPE',
      reply: OUT_OF_SCOPE_REPLY,
      filters: {},
      _provider: 'Local Scope Guard Engine',
    };
  }

  // LLM-powered Intent Classifier & Query Parser
  const systemPrompt = `You are the AI Assistant Intent Classifier and Query Parser for RentEase, a premier property rental and tenancy platform in Dhaka, Bangladesh.

Your role is to strictly evaluate the user's message and determine if it is within the scope of RentEase.

ALLOWED SCOPE (RentEase domain):
- Rental property search, listings, flats, apartments, houses, rooms, bachelor sublets, student accommodation in Dhaka.
- Rent prices, budgets, bedrooms, property amenities (lift, generator, parking, wifi, gas, balcony, security, etc.).
- Dhaka neighborhood living conditions, typical rents, security, and commute (e.g., Mirpur, Dhanmondi, Gulshan, Banani, Uttara, Bashundhara, Mohammadpur, etc.).
- Rental processes, tenancy laws/customs in Bangladesh, rental agreements, leases, advance rent/security deposits, tenant/landlord obligations.
- RentEase platform features (online booking, Stripe rent payments, maintenance/complaint requests, digital agreement signing).
- General greetings, polite pleasantries, or questions about what you can do.

DISALLOWED / OUT OF SCOPE:
- Any topic outside renting, housing, real estate, or RentEase.
- Specifically: war, military conflict, weapons, world politics, international relations, elections, programming/code, science, math, history trivia, movies, sports, recipes/food, medical/legal advice unrelated to tenancy, celebrity gossip, philosophy, etc.

OUTPUT SCHEMA (Return ONLY valid JSON):
{
  "intent": "OUT_OF_SCOPE" | "GREETING" | "GENERAL_RENTAL_INQUIRY" | "PROPERTY_SEARCH",
  "reply": string | null,
  "filters": {
    "location": string | null,
    "minPrice": number | null,
    "maxPrice": number | null,
    "bedrooms": number | null,
    "amenities": string[],
    "keywords": string[],
    "isFollowUpRefinement": boolean
  }
}

INSTRUCTIONS FOR INTENTS:
1. If OUT_OF_SCOPE:
   - Set "intent": "OUT_OF_SCOPE"
   - In "reply", write this exact refusal message:
     "${OUT_OF_SCOPE_REPLY}"
   - Set "filters" to all null/empty.
   - Do NOT retain previous search filters.

2. If GREETING:
   - Set "intent": "GREETING"
   - In "reply", provide a warm greeting introducing RentEase:
     "${GREETING_REPLY}"
   - Set "filters" to all null/empty.

3. If GENERAL_RENTAL_INQUIRY:
   - Set "intent": "GENERAL_RENTAL_INQUIRY"
   - In "reply", provide a thorough, accurate, and helpful answer to their rental question (e.g. security deposit norms in Dhaka, tenancy guidelines, or RentEase features like digital agreements and Stripe rent payment).
   - If they mentioned a specific location to search, populate "filters.location", otherwise keep filters null/empty.

4. If PROPERTY_SEARCH:
   - Set "intent": "PROPERTY_SEARCH"
   - Set "reply": null (grounded search results will be generated after querying database).
   - Carefully extract "location", "minPrice", "maxPrice", "bedrooms", "amenities", "keywords", and "isFollowUpRefinement".
   - If previous filters exist and the user is refining (e.g. "under 20k", "only with lift"), set "isFollowUpRefinement": true.`;

  const prompt = `Current Active Filters:
${JSON.stringify(currentFilters, null, 2)}

Recent Conversation History:
${conversationHistory
  .slice(-4)
  .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
  .join('\n')}

User Message:
"${userMessage}"

Respond with ONLY the JSON object conforming to the schema.`;

  const llmResult = await callLlm({
    systemInstruction: systemPrompt,
    prompt,
    jsonMode: true,
  });

  if (llmResult?.text) {
    try {
      const cleaned = llmResult.text.replace(/```json\n?|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      // Handle OUT_OF_SCOPE
      if (parsed.intent === 'OUT_OF_SCOPE') {
        return {
          intent: 'OUT_OF_SCOPE',
          reply: parsed.reply || OUT_OF_SCOPE_REPLY,
          filters: {},
          _provider: llmResult.provider,
        };
      }

      // Handle GREETING
      if (parsed.intent === 'GREETING') {
        return {
          intent: 'GREETING',
          reply: parsed.reply || GREETING_REPLY,
          filters: {},
          _provider: llmResult.provider,
        };
      }

      // Handle GENERAL_RENTAL_INQUIRY
      if (parsed.intent === 'GENERAL_RENTAL_INQUIRY') {
        return {
          intent: 'GENERAL_RENTAL_INQUIRY',
          reply: parsed.reply,
          filters: parsed.filters || {},
          _provider: llmResult.provider,
        };
      }

      // Handle PROPERTY_SEARCH
      const filterObj = parsed.filters || {};
      if (filterObj.isFollowUpRefinement && currentFilters && Object.keys(currentFilters).length > 0) {
        return {
          intent: 'PROPERTY_SEARCH',
          filters: {
            location: filterObj.location !== null ? filterObj.location : currentFilters.location || null,
            minPrice: filterObj.minPrice !== null ? filterObj.minPrice : currentFilters.minPrice || null,
            maxPrice: filterObj.maxPrice !== null ? filterObj.maxPrice : currentFilters.maxPrice || null,
            bedrooms: filterObj.bedrooms !== null ? filterObj.bedrooms : currentFilters.bedrooms || null,
            amenities: Array.from(new Set([...(currentFilters.amenities || []), ...(filterObj.amenities || [])])),
            keywords: Array.from(new Set([...(currentFilters.keywords || []), ...(filterObj.keywords || [])])),
            isFollowUpRefinement: true,
          },
          _provider: llmResult.provider,
        };
      }

      return {
        intent: 'PROPERTY_SEARCH',
        filters: filterObj,
        _provider: llmResult.provider,
      };
    } catch (parseErr) {
      console.warn('⚠️ [AI Assistant] Failed to parse LLM JSON, falling back to rule classifier:', parseErr.message);
    }
  }

  // Fallback to Rule-Based Classifier & Extractor
  return ruleBasedClassifierAndExtractor(userMessage, currentFilters);
}

// ── Smart Rule-Based Fallback Classifier & Extractor ─────────────────────────
function ruleBasedClassifierAndExtractor(text, currentFilters = {}) {
  const lower = text.toLowerCase().trim();

  // 1. Check Out of Scope
  const isOutOfScope = OUT_OF_SCOPE_PATTERNS.some((p) => p.test(lower));
  const hasRentalWord = RENTAL_KEYWORDS.some((kw) => new RegExp(`\\b${kw}\\b`, 'i').test(lower));
  const hasLoc = DHAKA_LOCATIONS.some((loc) => new RegExp(`\\b${loc}\\b`, 'i').test(lower));

  if (isOutOfScope && !hasRentalWord && !hasLoc) {
    return {
      intent: 'OUT_OF_SCOPE',
      reply: OUT_OF_SCOPE_REPLY,
      filters: {},
      _provider: 'Local Scope Guard Engine',
    };
  }

  // 2. Check Greeting
  if (GREETING_REGEX.test(lower)) {
    return {
      intent: 'GREETING',
      reply: GREETING_REPLY,
      filters: {},
      _provider: 'Local Scope Guard Engine',
    };
  }

  // 3. Check General Rental FAQ / Knowledge
  for (const faq of RENTAL_FAQ_KNOWLEDGE) {
    if (faq.keywords.some((kw) => lower.includes(kw))) {
      // Check if user also named a location
      let foundLoc = null;
      for (const loc of DHAKA_LOCATIONS) {
        if (lower.includes(loc)) {
          foundLoc = loc.charAt(0).toUpperCase() + loc.slice(1);
          break;
        }
      }
      return {
        intent: 'GENERAL_RENTAL_INQUIRY',
        reply: faq.answer,
        filters: foundLoc ? { location: foundLoc } : {},
        _provider: 'Local Rental Knowledge Engine',
      };
    }
  }

  // 4. Check Property Search or Non-Rental text
  // If no location and no rental terms, treat as out of scope
  if (!hasRentalWord && !hasLoc && !currentFilters.location) {
    return {
      intent: 'OUT_OF_SCOPE',
      reply: OUT_OF_SCOPE_REPLY,
      filters: {},
      _provider: 'Local Scope Guard Engine',
    };
  }

  // Extract filters
  const filters = {
    location: currentFilters.location || null,
    minPrice: currentFilters.minPrice || null,
    maxPrice: currentFilters.maxPrice || null,
    bedrooms: currentFilters.bedrooms || null,
    amenities: [...(currentFilters.amenities || [])],
    keywords: [...(currentFilters.keywords || [])],
    isFollowUpRefinement: Boolean(currentFilters.location || currentFilters.maxPrice),
  };

  // Location detection
  for (const loc of DHAKA_LOCATIONS) {
    if (lower.includes(loc)) {
      filters.location = loc.charAt(0).toUpperCase() + loc.slice(1);
      break;
    }
  }

  // Price detection (e.g. "under 20k", "below 20000", "max 25k")
  const maxPriceMatch = lower.match(/(?:under|below|max|upto|within|less than)\s*([0-9]+(?:\.[0-9]+)?)\s*(k|thousand)?/i);
  if (maxPriceMatch) {
    let val = parseFloat(maxPriceMatch[1]);
    if (maxPriceMatch[2]?.toLowerCase() === 'k' || maxPriceMatch[2]?.toLowerCase() === 'thousand') {
      val *= 1000;
    } else if (val < 100) {
      val *= 1000;
    }
    filters.maxPrice = Math.round(val);
  }

  // Bedroom detection
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

  return {
    intent: 'PROPERTY_SEARCH',
    filters,
    _provider: 'Local Rule Engine',
  };
}

// ── Stage 2: Database Query Execution ────────────────────────────────────────
async function executeDatabaseQuery(filters = {}) {
  try {
    const mongoQuery = { status: 'approved' };

    // Location filter
    if (filters.location && typeof filters.location === 'string' && filters.location.trim()) {
      mongoQuery.$or = [
        { location: { $regex: filters.location.trim(), $options: 'i' } },
        { title: { $regex: filters.location.trim(), $options: 'i' } },
      ];
    }

    // Price range filter
    if (
      (filters.minPrice !== null && filters.minPrice !== undefined) ||
      (filters.maxPrice !== null && filters.maxPrice !== undefined)
    ) {
      mongoQuery.price = {};
      if (filters.minPrice) mongoQuery.price.$gte = Number(filters.minPrice);
      if (filters.maxPrice) mongoQuery.price.$lte = Number(filters.maxPrice);
    }

    // Amenities filter
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

    let listings = await Listing.find(mongoQuery)
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Refine by bedrooms if requested
    if (filters.bedrooms && listings.length > 0) {
      const bedNum = filters.bedrooms;
      const bedRegex = new RegExp(`(?:\\b${bedNum}\\s*(?:-| )?\\s*(?:bed|bedroom|bhk)|\\b${bedNum}b\\b)`, 'i');
      const matchedWithBed = listings.filter((l) => bedRegex.test(l.title) || bedRegex.test(l.description));
      if (matchedWithBed.length > 0) {
        listings = matchedWithBed;
      }
    }

    // If 0 matches, fetch relaxed results in the same location
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
  } catch (err) {
    console.error('❌ [AI Assistant] Database query error:', err.message);
    return { listings: [], relaxedResults: [] };
  }
}

// ── Stage 3: Grounded LLM Response Generator ─────────────────────────────────
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

  // Fallback template response
  return {
    reply: formatRuleBasedResponse(listings, filters, relaxedResults),
    provider: 'Local Rule Engine',
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
  // Step 1: Classify intent and parse structured query
  const parsed = await classifyAndParseQuery(message, history, currentFilters);

  // Intent A: OUT_OF_SCOPE — Strictly block listings and refuse politely
  if (parsed.intent === 'OUT_OF_SCOPE') {
    return {
      intent: 'OUT_OF_SCOPE',
      reply: parsed.reply || OUT_OF_SCOPE_REPLY,
      filters: {},
      listings: [],
      isRelaxed: false,
      provider: parsed._provider || 'Rental Scope Guard',
    };
  }

  // Intent B: GREETING — Friendly welcome without dumping listings
  if (parsed.intent === 'GREETING') {
    return {
      intent: 'GREETING',
      reply: parsed.reply || GREETING_REPLY,
      filters: {},
      listings: [],
      isRelaxed: false,
      provider: parsed._provider || 'Rental Scope Guard',
    };
  }

  // Intent C: GENERAL_RENTAL_INQUIRY without specific property search filters
  if (parsed.intent === 'GENERAL_RENTAL_INQUIRY' && !parsed.filters?.location && !parsed.filters?.maxPrice) {
    return {
      intent: 'GENERAL_RENTAL_INQUIRY',
      reply: parsed.reply,
      filters: {},
      listings: [],
      isRelaxed: false,
      provider: parsed._provider || 'Rental Knowledge Base',
    };
  }

  // Intent D: PROPERTY_SEARCH (or rental inquiry with location/budget)
  const filters = parsed.filters || {};
  const { listings, relaxedResults } = await executeDatabaseQuery(filters);

  // If general inquiry had an informational answer and also found location listings
  if (parsed.intent === 'GENERAL_RENTAL_INQUIRY' && parsed.reply) {
    let combinedReply = parsed.reply;
    if (listings.length > 0) {
      combinedReply += `\n\nHere are verified properties currently available in **${filters.location}**:`;
    }
    return {
      intent: 'GENERAL_RENTAL_INQUIRY',
      reply: combinedReply,
      filters,
      listings: listings.length > 0 ? listings : relaxedResults,
      isRelaxed: listings.length === 0 && relaxedResults.length > 0,
      provider: parsed._provider,
    };
  }

  // Generate grounded LLM response for property search
  const { reply, provider } = await generateGroundedResponse({
    userMessage: message,
    conversationHistory: history,
    filters,
    listings,
    relaxedResults,
  });

  return {
    intent: 'PROPERTY_SEARCH',
    reply,
    filters,
    listings: listings.length > 0 ? listings : relaxedResults,
    isRelaxed: listings.length === 0 && relaxedResults.length > 0,
    provider: provider || parsed._provider,
  };
}

module.exports = {
  processAssistantChat,
  classifyAndParseQuery,
  parseNaturalLanguageQuery: classifyAndParseQuery,
  executeDatabaseQuery,
  generateGroundedResponse,
  OUT_OF_SCOPE_REPLY,
  GREETING_REPLY,
};
