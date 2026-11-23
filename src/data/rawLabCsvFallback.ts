import { LabEntry } from '../types';

export const RAW_LAB_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR8QbYqPYx_PnohNVTT-hAU-NkOt9hVh-INeH_SJPwoYJpoRsBUGdmanYRZiz3ll1J0scf5U_vju3nG/pub?gid=355721692&single=true&output=csv";

export const DIRECT_EXPORT_LAB_CSV_URL = "https://docs.google.com/spreadsheets/d/1Meep9uT4Q2qRWaBM1Bwu4ZnYNB0J51ib-hP1OsOOCuI/export?format=csv&gid=355721692";

export const FALLBACK_LAB_ENTRIES: LabEntry[] = [
  {
    "id": "anthropic",
    "group": "top10",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Anthropic",
    "famousFor": "",
    "engineName": "Claude",
    "weightsType": "closed",
    "openWeights": {
      "medium": false,
      "massive": false,
      "planetary": false,
      "singularity": false
    },
    "parameterSizes": {
      "small": "",
      "medium": "Haiku",
      "large": "",
      "massive": "Sonnet",
      "colossal": "",
      "planetary": "Opus",
      "singularity": "Fable/Mythos",
      "godTier": ""
    },
    "subscriptionTiers": "Pro, Max, Ultra, Team, Enterprise",
    "harnessSdk": "Claude SDK +Managed Agents",
    "dailyAgent": "Claude Duet",
    "codingAgent": "Claude Code & Cowork"
  },
  {
    "id": "small-18",
    "group": "top10",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Google",
    "famousFor": "YouTube, Android",
    "engineName": "Gemini",
    "weightsType": "hybrid",
    "openWeights": {
      "small": true,
      "medium": false,
      "large": false,
      "massive": false,
      "colossal": false,
      "planetary": false,
      "singularity": false
    },
    "parameterSizes": {
      "small": "Gemma",
      "medium": "Helium",
      "large": "Flash",
      "massive": "Hydrogen",
      "colossal": "Neon",
      "planetary": "Argon",
      "singularity": "Carbon",
      "godTier": ""
    },
    "subscriptionTiers": "Plus, Pro, Ultra",
    "harnessSdk": "Antigravity Harness",
    "dailyAgent": "Notebook; Tasks",
    "codingAgent": "Antigravity; Build"
  },
  {
    "id": "small-19",
    "group": "top10",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Meta",
    "famousFor": "Facebook, Insta, WhatsApp",
    "engineName": "Muse",
    "weightsType": "hybrid",
    "openWeights": {
      "small": true,
      "medium": false,
      "massive": false,
      "planetary": false,
      "singularity": false
    },
    "parameterSizes": {
      "small": "Glimmer",
      "medium": "Ember",
      "large": "",
      "massive": "Spark",
      "colossal": "",
      "planetary": "Wonder",
      "singularity": "Wonder Full",
      "godTier": ""
    },
    "subscriptionTiers": "Core, Premium, Essential, Advanced, Expert, Max",
    "harnessSdk": "Muse Hatch",
    "dailyAgent": "Muse App",
    "codingAgent": "Muse Code"
  },
  {
    "id": "nvidia",
    "group": "top10",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Nvidia",
    "famousFor": "AI- & GeForce graphics chips",
    "engineName": "Nemotron",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "medium": true,
      "large": true,
      "colossal": true
    },
    "parameterSizes": {
      "small": "Lightning",
      "medium": "Bolt",
      "large": "Super",
      "massive": "",
      "colossal": "Ultra",
      "planetary": "",
      "singularity": "",
      "godTier": ""
    },
    "subscriptionTiers": "",
    "harnessSdk": "NemoClaw +NeMo Toolkit",
    "dailyAgent": "–",
    "codingAgent": "Enterprise AI Fact."
  },
  {
    "id": "openai",
    "group": "top10",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "OpenAI",
    "famousFor": "ChatGPT",
    "engineName": "GPT",
    "weightsType": "hybrid",
    "openWeights": {
      "small": true,
      "medium": false,
      "massive": false,
      "planetary": false,
      "singularity": false
    },
    "parameterSizes": {
      "small": "gpt-oss",
      "medium": "Luna",
      "large": "",
      "massive": "Terra",
      "colossal": "",
      "planetary": "Sol",
      "singularity": "Astra/Cyber",
      "godTier": ""
    },
    "subscriptionTiers": "Go, Plus, Pro, Business, Ent.",
    "harnessSdk": "Codex Harness",
    "dailyAgent": "Dots, ChatGPT Work",
    "codingAgent": "Codex + Workspace"
  },
  {
    "id": "spacexai",
    "group": "top10",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "SpaceXSI",
    "famousFor": "Tesla, Twitter/X",
    "engineName": "Grok",
    "weightsType": "hybrid",
    "openWeights": {
      "medium": false,
      "large": true,
      "massive": true,
      "colossal": false,
      "planetary": false
    },
    "parameterSizes": {
      "small": "",
      "medium": "v0",
      "large": "v1",
      "massive": "v2",
      "colossal": "v3",
      "planetary": "v4",
      "singularity": "",
      "godTier": ""
    },
    "subscriptionTiers": "Supergrok Lite, Plus, Heavy, Bus., Ent.",
    "harnessSdk": "Cursor Engine",
    "dailyAgent": "Grok Bot",
    "codingAgent": "Cursor Agent, Grok Build"
  },
  {
    "id": "small-16",
    "group": "top10",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "Alibaba",
    "famousFor": "chinese  Amazon \"Taobao\"",
    "engineName": "Qwen",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "large": true,
      "massive": true,
      "planetary": true
    },
    "parameterSizes": {
      "small": "Qwen",
      "medium": "",
      "large": "Flash",
      "massive": "Plus",
      "colossal": "",
      "planetary": "Max",
      "singularity": "",
      "godTier": ""
    },
    "subscriptionTiers": "Lite, Essential, Standard, Pro, Team Pro & Max",
    "harnessSdk": "Qoder Cloud Agents; Tongyi Harness",
    "dailyAgent": "Qoder; Deep Research",
    "codingAgent": "Qwen Code; Tongyi Lingma"
  },
  {
    "id": "small-17",
    "group": "top10",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "DeepSeek",
    "famousFor": "",
    "engineName": "DeepSeek",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "medium": true,
      "massive": true,
      "planetary": true
    },
    "parameterSizes": {
      "small": "Qwen based R1 Distill",
      "medium": "Llama based R1 Distill",
      "large": "",
      "massive": "Flash",
      "colossal": "",
      "planetary": "Pro",
      "singularity": "",
      "godTier": ""
    },
    "subscriptionTiers": "per token price",
    "harnessSdk": "DeepSeek Harness",
    "dailyAgent": "-",
    "codingAgent": "Deep Code"
  },
  {
    "id": "moonshot",
    "group": "top10",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "Moonshot",
    "famousFor": "",
    "engineName": "Kimi",
    "weightsType": "hybrid",
    "openWeights": {
      "massive": false,
      "colossal": true,
      "planetary": true
    },
    "parameterSizes": {
      "small": "",
      "medium": "",
      "large": "",
      "massive": "K1",
      "colossal": "K2",
      "planetary": "K3",
      "singularity": "",
      "godTier": ""
    },
    "subscriptionTiers": "Plus, Pro, Max, Ultra, Prem.",
    "harnessSdk": "Kimi Code & Work Harness",
    "dailyAgent": "Kimi Work",
    "codingAgent": "Kimi Code & Claw"
  },
  {
    "id": "zhipu",
    "group": "top10",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "Zhipu",
    "famousFor": "Z.ai",
    "engineName": "GLM",
    "weightsType": "open",
    "openWeights": {
      "large": true,
      "massive": true,
      "colossal": true
    },
    "parameterSizes": {
      "small": "",
      "medium": "",
      "large": "V",
      "massive": "Flash",
      "colossal": "GLM",
      "planetary": "",
      "singularity": "",
      "godTier": ""
    },
    "subscriptionTiers": "Lite, Pro, Max, Team Standard & Premium",
    "harnessSdk": "ZCode Harness",
    "dailyAgent": "AutoClaw with AutoGLM",
    "codingAgent": "Zcode"
  },
  {
    "id": "contender-1",
    "group": "contender",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Amazon",
    "engineName": "Nova",
    "famousFor": "known for Alexa",
    "notesLabel": "Notes",
    "weightsType": "closed",
    "openWeights": {
      "small": false,
      "medium": false,
      "large": false,
      "massive": false
    },
    "parameterSizes": {
      "tiny": "",
      "small": "Lite",
      "medium": "Pro",
      "large": "Pro 2",
      "massive": "Premier",
      "colossal": "",
      "planetary": ""
    },
    "specialties": "known for Alexa"
  },
  {
    "id": "contender-2",
    "group": "contender",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Inception",
    "engineName": "Mercury",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "closed",
    "openWeights": {
      "medium": false,
      "large": false,
      "massive": false,
      "colossal": false
    },
    "parameterSizes": {
      "tiny": "",
      "small": "",
      "medium": "v1",
      "large": "v2",
      "massive": "v2.5",
      "colossal": "v3",
      "planetary": ""
    },
    "specialties": ""
  },
  {
    "id": "contender-3",
    "group": "contender",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Microsoft",
    "engineName": "Phi & MAI",
    "famousFor": "known for Windows, Copilot, Autopilot Agent",
    "notesLabel": "Notes",
    "weightsType": "hybrid",
    "openWeights": {
      "tiny": true,
      "large": false,
      "massive": false,
      "colossal": false,
      "planetary": false
    },
    "parameterSizes": {
      "tiny": "Phi",
      "small": "",
      "medium": "",
      "large": "MAI 1 Flash Series",
      "massive": "MAI 2 Flash Series",
      "colossal": "MAI Thinking",
      "planetary": "MAI Code"
    },
    "specialties": "known for Windows, Copilot, Autopilot Agent"
  },
  {
    "id": "contender-4",
    "group": "contender",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Reflection",
    "engineName": "Beam",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "massive": true
    },
    "parameterSizes": {
      "tiny": "",
      "small": "",
      "medium": "",
      "large": "",
      "massive": "v1",
      "colossal": "",
      "planetary": ""
    },
    "specialties": ""
  },
  {
    "id": "contender-5",
    "group": "contender",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Thinking Machines",
    "engineName": "Inkling",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "massive": true,
      "colossal": true
    },
    "parameterSizes": {
      "tiny": "",
      "small": "Mini",
      "medium": "",
      "large": "",
      "massive": "Small",
      "colossal": "Inkling",
      "planetary": ""
    },
    "specialties": ""
  },
  {
    "id": "contender-6",
    "group": "contender",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "SSI.inc",
    "engineName": "SSI",
    "famousFor": "probably incoming end of 26",
    "notesLabel": "Notes",
    "parameterSizes": {
      "tiny": "",
      "small": "",
      "medium": "",
      "large": "",
      "massive": "",
      "colossal": "",
      "planetary": ""
    },
    "specialties": "probably incoming end of 26"
  },
  {
    "id": "contender-7",
    "group": "contender",
    "country": "Canada",
    "countryFlag": "🇨🇦",
    "creator": "Cohere",
    "engineName": "-",
    "famousFor": "merged with Aleph-Alpha",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "tiny": true,
      "small": true,
      "medium": true,
      "large": true
    },
    "parameterSizes": {
      "tiny": "Command R7B",
      "small": "Command R",
      "medium": "Command R+ & A; Kolibri",
      "large": "Command A+",
      "massive": "",
      "colossal": "",
      "planetary": ""
    },
    "specialties": "merged with Aleph-Alpha"
  },
  {
    "id": "contender-8",
    "group": "contender",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "Ant Group",
    "engineName": "Ling",
    "famousFor": "known as InclusionAI",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "medium": true,
      "large": true,
      "massive": true
    },
    "parameterSizes": {
      "tiny": "",
      "small": "Mini",
      "medium": "Lite",
      "large": "Flash",
      "massive": "Plus",
      "colossal": "",
      "planetary": ""
    },
    "specialties": "known as InclusionAI"
  },
  {
    "id": "contender-9",
    "group": "contender",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "Baidu",
    "engineName": "ERNIE",
    "famousFor": "chinese Google \"Baidu\"",
    "notesLabel": "Notes",
    "weightsType": "hybrid",
    "openWeights": {
      "small": true,
      "medium": false,
      "large": false,
      "massive": false,
      "colossal": false,
      "planetary": false
    },
    "parameterSizes": {
      "tiny": "",
      "small": "ERNIE",
      "medium": "v1",
      "large": "v2",
      "massive": "v3",
      "colossal": "v4",
      "planetary": "v5"
    },
    "specialties": "chinese Google \"Baidu\""
  },
  {
    "id": "contender-10",
    "group": "contender",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "Meituan",
    "engineName": "LongCat",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "medium": true,
      "colossal": true,
      "planetary": true
    },
    "parameterSizes": {
      "tiny": "",
      "small": "",
      "medium": "Flash-Lite",
      "large": "",
      "massive": "",
      "colossal": "Flash-Thinking",
      "planetary": "v2"
    },
    "specialties": ""
  },
  {
    "id": "contender-11",
    "group": "contender",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "MiniMax",
    "engineName": "M",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "large": true,
      "massive": true,
      "colossal": true
    },
    "parameterSizes": {
      "tiny": "",
      "small": "",
      "medium": "",
      "large": "v2",
      "massive": "v1",
      "colossal": "v3",
      "planetary": ""
    },
    "specialties": ""
  },
  {
    "id": "contender-12",
    "group": "contender",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "Nex AGI",
    "engineName": "N",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "medium": true,
      "massive": true,
      "planetary": true
    },
    "parameterSizes": {
      "tiny": "",
      "small": "",
      "medium": "Mini",
      "large": "",
      "massive": "Pro",
      "colossal": "",
      "planetary": "Max"
    },
    "specialties": ""
  },
  {
    "id": "contender-13",
    "group": "contender",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "Unisound",
    "engineName": "U",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "closed",
    "openWeights": {
      "medium": false,
      "massive": false
    },
    "parameterSizes": {
      "tiny": "",
      "small": "",
      "medium": "v1",
      "large": "",
      "massive": "v2",
      "colossal": "",
      "planetary": ""
    },
    "specialties": ""
  },
  {
    "id": "contender-14",
    "group": "contender",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "Stepfun",
    "engineName": "Step",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "medium": true,
      "large": true,
      "massive": true,
      "colossal": true
    },
    "parameterSizes": {
      "tiny": "",
      "small": "VL",
      "medium": "v1",
      "large": "v3",
      "massive": "v2",
      "colossal": "v5",
      "planetary": ""
    },
    "specialties": ""
  },
  {
    "id": "contender-15",
    "group": "contender",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "Tencent",
    "engineName": "Hy / Hunyuan",
    "famousFor": "chinese WhatsApp \"WeChat\"",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "medium": true,
      "large": true,
      "massive": true,
      "colossal": true
    },
    "parameterSizes": {
      "tiny": "",
      "small": "",
      "medium": "v1",
      "large": "v2",
      "massive": "v3",
      "colossal": "v4",
      "planetary": ""
    },
    "specialties": "chinese WhatsApp \"WeChat\""
  },
  {
    "id": "contender-16",
    "group": "contender",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "Xiaomi",
    "engineName": "MiMo",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "massive": true,
      "colossal": true
    },
    "parameterSizes": {
      "tiny": "",
      "small": "V1",
      "medium": "",
      "large": "",
      "massive": "Flash",
      "colossal": "Pro",
      "planetary": ""
    },
    "specialties": ""
  },
  {
    "id": "contender-17",
    "group": "contender",
    "country": "France",
    "countryFlag": "🇫🇷",
    "creator": "MIstral AI",
    "engineName": "Mistral",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "medium": true,
      "large": true,
      "colossal": true
    },
    "parameterSizes": {
      "tiny": "",
      "small": "Ministral",
      "medium": "Small",
      "large": "Medium",
      "massive": "",
      "colossal": "Large",
      "planetary": ""
    },
    "specialties": ""
  },
  {
    "id": "contender-18",
    "group": "contender",
    "country": "Israel",
    "countryFlag": "🇮🇱",
    "creator": "AI21 Labs",
    "engineName": "Jamba",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "medium": true,
      "massive": true
    },
    "parameterSizes": {
      "tiny": "",
      "small": "",
      "medium": "Mini",
      "large": "",
      "massive": "Large",
      "colossal": "",
      "planetary": ""
    },
    "specialties": ""
  },
  {
    "id": "contender-19",
    "group": "contender",
    "country": "Singapore",
    "countryFlag": "🇸🇬",
    "creator": "Sapiens AI",
    "engineName": "Agnes",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "closed",
    "openWeights": {
      "medium": false,
      "massive": false
    },
    "parameterSizes": {
      "tiny": "",
      "small": "",
      "medium": "Flash",
      "large": "",
      "massive": "Pro",
      "colossal": "",
      "planetary": ""
    },
    "specialties": ""
  },
  {
    "id": "contender-20",
    "group": "contender",
    "country": "South Korea",
    "countryFlag": "🇰🇷",
    "creator": "LG AI Research",
    "engineName": "K-EXAONE",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "large": true,
      "colossal": true
    },
    "parameterSizes": {
      "tiny": "",
      "small": "",
      "medium": "",
      "large": "v1",
      "massive": "",
      "colossal": "v2",
      "planetary": ""
    },
    "specialties": ""
  },
  {
    "id": "contender-21",
    "group": "contender",
    "country": "South Korea",
    "countryFlag": "🇰🇷",
    "creator": "Motif Technologies",
    "engineName": "Motif",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "medium": true,
      "massive": true
    },
    "parameterSizes": {
      "tiny": "",
      "small": "v2",
      "medium": "v1",
      "large": "",
      "massive": "v3",
      "colossal": "",
      "planetary": ""
    },
    "specialties": ""
  },
  {
    "id": "contender-22",
    "group": "contender",
    "country": "South Korea",
    "countryFlag": "🇰🇷",
    "creator": "SK Telecom",
    "engineName": "A.X",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "colossal": true
    },
    "parameterSizes": {
      "tiny": "",
      "small": "",
      "medium": "",
      "large": "",
      "massive": "",
      "colossal": "K2",
      "planetary": ""
    },
    "specialties": ""
  },
  {
    "id": "contender-23",
    "group": "contender",
    "country": "South Korea",
    "countryFlag": "🇰🇷",
    "creator": "Upstage",
    "engineName": "Solar",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "hybrid",
    "openWeights": {
      "small": true,
      "medium": true,
      "large": true,
      "massive": false
    },
    "parameterSizes": {
      "tiny": "",
      "small": "Mini",
      "medium": "v1",
      "large": "v2",
      "massive": "v4",
      "colossal": "",
      "planetary": ""
    },
    "specialties": ""
  },
  {
    "id": "contender-24",
    "group": "contender",
    "country": "UAE",
    "countryFlag": "🇦🇪",
    "creator": "MBZUAI*",
    "engineName": "K2",
    "famousFor": "*Institute of Foundation Models",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "medium": true,
      "massive": true
    },
    "parameterSizes": {
      "tiny": "",
      "small": "",
      "medium": "Think",
      "large": "",
      "massive": "Horizon",
      "colossal": "",
      "planetary": ""
    },
    "specialties": "*Institute of Foundation Models"
  },
  {
    "id": "tweaker-1",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Abacus AI",
    "engineName": "Smaug",
    "basedOn": "Qwen",
    "famousFor": "Based on Qwen",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "massive": true,
      "planetary": true
    },
    "parameterSizes": {
      "small": "Mini",
      "medium": "",
      "large": "",
      "massive": "Flash",
      "colossal": "",
      "planetary": "Agentic"
    },
    "specialties": "Based on Qwen"
  },
  {
    "id": "tweaker-2",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Apodex",
    "engineName": "Apodex",
    "basedOn": "Qwen",
    "famousFor": "Based on Qwen",
    "weightsType": "hybrid",
    "openWeights": {
      "small": true,
      "massive": false
    },
    "parameterSizes": {
      "small": "Mini",
      "medium": "",
      "large": "",
      "massive": "v1",
      "colossal": "",
      "planetary": ""
    },
    "specialties": "Based on Qwen"
  },
  {
    "id": "tweaker-3",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Apple",
    "engineName": "Siri AI for macOS",
    "basedOn": "Gemini trained Apple Foundation models",
    "famousFor": "Based on Gemini trained Apple Foundation models",
    "weightsType": "hybrid",
    "openWeights": {
      "small": true,
      "medium": false,
      "large": false,
      "colossal": false
    },
    "parameterSizes": {
      "small": "OpenELM",
      "medium": "Flash-Lite trained AFM",
      "large": "Flash trained AFM",
      "massive": "",
      "colossal": "Pro trained AFM",
      "planetary": ""
    },
    "specialties": "Based on Gemini trained Apple Foundation models"
  },
  {
    "id": "tweaker-4",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Arcee AI",
    "engineName": "Trinity",
    "basedOn": "Llama, Mistral, Qwen",
    "famousFor": "Based on Llama, Mistral, Qwen",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "medium": true,
      "massive": true
    },
    "parameterSizes": {
      "small": "SuperNova-Medius",
      "medium": "Virtuoso-Large",
      "large": "",
      "massive": "Trinity-Large-Thinking",
      "colossal": "",
      "planetary": ""
    },
    "specialties": "Based on Llama, Mistral, Qwen"
  },
  {
    "id": "tweaker-5",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Circuit&Chisel / Unbiased.ai",
    "engineName": "Pareto",
    "basedOn": "Various",
    "famousFor": "Based on Various",
    "weightsType": "open",
    "openWeights": {
      "small": true
    },
    "parameterSizes": {
      "small": "noname orchestrator",
      "medium": "",
      "large": "",
      "massive": "",
      "colossal": "",
      "planetary": ""
    },
    "specialties": "Based on Various"
  },
  {
    "id": "tweaker-6",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Cognitive Computations",
    "engineName": "Dolphin",
    "basedOn": "uncensored Llama, Mistral, Qwen",
    "famousFor": "Based on uncensored Llama, Mistral, Qwen",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "massive": true
    },
    "parameterSizes": {
      "small": "R1",
      "medium": "",
      "large": "",
      "massive": "X1",
      "colossal": "",
      "planetary": ""
    },
    "specialties": "Based on uncensored Llama, Mistral, Qwen"
  },
  {
    "id": "tweaker-7",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "DeepReinforce",
    "engineName": "Ornith",
    "basedOn": "Qwen, Gemma",
    "famousFor": "Based on Qwen, Gemma",
    "weightsType": "open",
    "openWeights": {
      "massive": true
    },
    "parameterSizes": {
      "small": "",
      "medium": "",
      "large": "",
      "massive": "v1",
      "colossal": "",
      "planetary": ""
    },
    "specialties": "Based on Qwen, Gemma"
  },
  {
    "id": "tweaker-8",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Fireworks AI",
    "engineName": "Ember",
    "basedOn": "Kimi K3",
    "famousFor": "Based on Kimi K3",
    "weightsType": "closed",
    "openWeights": {
      "planetary": false
    },
    "parameterSizes": {
      "small": "",
      "medium": "",
      "large": "",
      "massive": "",
      "colossal": "",
      "planetary": "Ember-1"
    },
    "specialties": "Based on Kimi K3"
  },
  {
    "id": "tweaker-9",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Perplexity",
    "engineName": "Sonar",
    "basedOn": "Llama, Mistral",
    "famousFor": "Based on Llama, Mistral",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "medium": true,
      "massive": true
    },
    "parameterSizes": {
      "small": "Mistral",
      "medium": "Llama",
      "large": "",
      "massive": "Llama",
      "colossal": "",
      "planetary": ""
    },
    "specialties": "Based on Llama, Mistral"
  },
  {
    "id": "tweaker-10",
    "group": "tweakers",
    "country": "Japan",
    "countryFlag": "🇯🇵",
    "creator": "Sakana AI",
    "engineName": "Sakana",
    "basedOn": "Kimi, Qwen",
    "famousFor": "Based on Kimi, Qwen",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "massive": true
    },
    "parameterSizes": {
      "small": "Fugu orchestrator",
      "medium": "",
      "large": "",
      "massive": "Namazu",
      "colossal": "",
      "planetary": ""
    },
    "specialties": "Based on Kimi, Qwen"
  },
  {
    "id": "tweaker-11",
    "group": "tweakers",
    "country": "Saudi Arabia",
    "countryFlag": "🇸🇦",
    "creator": "HUMAIN",
    "engineName": "M",
    "basedOn": "MiniMax",
    "famousFor": "Based on MiniMax",
    "weightsType": "closed",
    "openWeights": {
      "small": false,
      "medium": false,
      "massive": false
    },
    "parameterSizes": {
      "small": "v1",
      "medium": "v2",
      "large": "",
      "massive": "v3",
      "colossal": "",
      "planetary": ""
    },
    "specialties": "Based on MiniMax"
  },
  {
    "id": "tweaker-12",
    "group": "tweakers",
    "country": "Spain",
    "countryFlag": "🇪🇸",
    "creator": "Multiverse Computing",
    "engineName": "-",
    "basedOn": "GLM",
    "famousFor": "Based on GLM",
    "weightsType": "closed",
    "openWeights": {
      "medium": false,
      "massive": false
    },
    "parameterSizes": {
      "small": "",
      "medium": "HyperNova",
      "large": "",
      "massive": "Quasar",
      "colossal": "",
      "planetary": ""
    },
    "specialties": "Based on GLM"
  },
  {
    "id": "small-1",
    "group": "small",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Hugging Face",
    "engineName": "SmolLM",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "mini": true
    },
    "parameterSizes": {
      "micro": "",
      "mini": "SmolLM",
      "tiny": "",
      "small": "",
      "medium": "",
      "large": ""
    },
    "specialties": ""
  },
  {
    "id": "small-2",
    "group": "small",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "IBM",
    "engineName": "Granite",
    "famousFor": "known for Watson, SPSS",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "small": true
    },
    "parameterSizes": {
      "micro": "",
      "mini": "",
      "tiny": "",
      "small": "Granite",
      "medium": "",
      "large": ""
    },
    "specialties": "known for Watson, SPSS"
  },
  {
    "id": "small-3",
    "group": "small",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Liquid AI",
    "engineName": "LFM",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "hybrid",
    "openWeights": {
      "mini": false,
      "tiny": true,
      "medium": false
    },
    "parameterSizes": {
      "micro": "",
      "mini": "v3",
      "tiny": "v2",
      "small": "",
      "medium": "v1",
      "large": ""
    },
    "specialties": ""
  },
  {
    "id": "small-4",
    "group": "small",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Magic.dev",
    "engineName": "LTM",
    "famousFor": "Scam?",
    "notesLabel": "Notes",
    "weightsType": "closed",
    "openWeights": {
      "mini": false,
      "small": false
    },
    "parameterSizes": {
      "micro": "",
      "mini": "v1",
      "tiny": "",
      "small": "v2",
      "medium": "",
      "large": ""
    },
    "specialties": "Scam?"
  },
  {
    "id": "small-5",
    "group": "small",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Morph Labs",
    "engineName": "diverse",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "micro": true,
      "mini": true,
      "tiny": true
    },
    "parameterSizes": {
      "micro": "Reflexes",
      "mini": "Warp Grep",
      "tiny": "Fast Apply",
      "small": "",
      "medium": "",
      "large": ""
    },
    "specialties": ""
  },
  {
    "id": "small-6",
    "group": "small",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Poolside",
    "engineName": "Laguna",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "medium": true,
      "large": true
    },
    "parameterSizes": {
      "micro": "",
      "mini": "",
      "tiny": "",
      "small": "XS",
      "medium": "S",
      "large": "M"
    },
    "specialties": ""
  },
  {
    "id": "small-7",
    "group": "small",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "PrismML",
    "engineName": "Bonsai",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "tiny": true,
      "small": true
    },
    "parameterSizes": {
      "micro": "",
      "mini": "",
      "tiny": "v1",
      "small": "Qwen3 re-spins",
      "medium": "",
      "large": ""
    },
    "specialties": ""
  },
  {
    "id": "small-8",
    "group": "small",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "01.AI",
    "engineName": "Yi",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "hybrid",
    "openWeights": {
      "small": true,
      "medium": false,
      "large": false
    },
    "parameterSizes": {
      "micro": "",
      "mini": "",
      "tiny": "",
      "small": "v1",
      "medium": "Lightning",
      "large": "Large"
    },
    "specialties": ""
  },
  {
    "id": "small-9",
    "group": "small",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "ByteDance",
    "engineName": "Dola-Seed",
    "famousFor": "known for TikTok",
    "notesLabel": "Notes",
    "weightsType": "closed",
    "openWeights": {
      "small": false,
      "medium": false,
      "large": false
    },
    "parameterSizes": {
      "micro": "",
      "mini": "",
      "tiny": "",
      "small": "Mini",
      "medium": "Lite",
      "large": "Pro"
    },
    "specialties": "known for TikTok"
  },
  {
    "id": "small-10",
    "group": "small",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "iFlytek",
    "engineName": "Spark",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "hybrid",
    "openWeights": {
      "mini": true,
      "tiny": true,
      "medium": false,
      "large": false
    },
    "parameterSizes": {
      "micro": "",
      "mini": "V1",
      "tiny": "V4",
      "small": "",
      "medium": "X1",
      "large": "X2"
    },
    "specialties": ""
  },
  {
    "id": "small-11",
    "group": "small",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "OpenBMB",
    "engineName": "MiniCPM",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "tiny": true,
      "small": true
    },
    "parameterSizes": {
      "micro": "",
      "mini": "",
      "tiny": "v1",
      "small": "v4",
      "medium": "",
      "large": ""
    },
    "specialties": ""
  },
  {
    "id": "small-12",
    "group": "small",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "Shanghai AI Lab",
    "engineName": "Intern",
    "famousFor": "big GLM 5.x re-spin",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "mini": true,
      "tiny": true,
      "small": true,
      "medium": true
    },
    "parameterSizes": {
      "micro": "",
      "mini": "LM 1",
      "tiny": "LM 2",
      "small": "VL",
      "medium": "LM 3",
      "large": ""
    },
    "specialties": "big GLM 5.x re-spin"
  },
  {
    "id": "small-13",
    "group": "small",
    "country": "India",
    "countryFlag": "🇮🇳",
    "creator": "Sarvam AI",
    "engineName": "Sarvam",
    "famousFor": "",
    "notesLabel": "Notes",
    "weightsType": "open",
    "openWeights": {
      "mini": true,
      "medium": true
    },
    "parameterSizes": {
      "micro": "",
      "mini": "v1",
      "tiny": "",
      "small": "",
      "medium": "v2",
      "large": ""
    },
    "specialties": ""
  },
  {
    "id": "small-14",
    "group": "small",
    "country": "South Korea",
    "countryFlag": "🇰🇷",
    "creator": "Samsung",
    "engineName": "Gauss",
    "famousFor": "AI for GalaxyPhones",
    "notesLabel": "Notes",
    "weightsType": "closed",
    "openWeights": {
      "mini": false,
      "small": false,
      "large": false
    },
    "parameterSizes": {
      "micro": "",
      "mini": "Compact",
      "tiny": "",
      "small": "Balanced",
      "medium": "",
      "large": "Supreme"
    },
    "specialties": "AI for GalaxyPhones"
  },
  {
    "id": "harness-1",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Aider",
    "famousFor": "",
    "engineName": "Aider Git Harness",
    "harness": "Aider Git Harness",
    "form": "CLI",
    "note": "Canadian origin (Paul Gauthier)",
    "specialties": "",
    "parameterSizes": {}
  },
  {
    "id": "harness-2",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "All Hands AI",
    "famousFor": "",
    "engineName": "OpenHands",
    "harness": "OpenHands",
    "form": "CLI + Web SDK",
    "note": "formerly OpenDevin",
    "specialties": "",
    "parameterSizes": {}
  },
  {
    "id": "harness-3",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Augment Code",
    "famousFor": "",
    "engineName": "Context Engine",
    "harness": "Context Engine",
    "form": "IDE",
    "note": "",
    "specialties": "",
    "parameterSizes": {}
  },
  {
    "id": "harness-4",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "CodeRabbit",
    "famousFor": "",
    "engineName": "CodeRabbit",
    "harness": "CodeRabbit",
    "form": "IDE + CLI + Git",
    "note": "",
    "specialties": "",
    "parameterSizes": {}
  },
  {
    "id": "harness-5",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Coder",
    "famousFor": "",
    "engineName": "Coder Agents",
    "harness": "Coder Agents",
    "form": "Web",
    "note": "",
    "specialties": "",
    "parameterSizes": {}
  },
  {
    "id": "harness-6",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Cognition AI",
    "famousFor": "",
    "engineName": "Devin",
    "harness": "Devin",
    "form": "IDE + CLI + Web",
    "note": "formerly Windsurf",
    "specialties": "",
    "parameterSizes": {}
  },
  {
    "id": "harness-7",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Factory AI",
    "famousFor": "",
    "engineName": "Droid",
    "harness": "Droid",
    "form": "CLI",
    "note": "",
    "specialties": "",
    "parameterSizes": {}
  },
  {
    "id": "harness-8",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "LangChain",
    "famousFor": "",
    "engineName": "Deep Agents + LangGraph",
    "harness": "Deep Agents + LangGraph",
    "form": "SDK",
    "note": "",
    "specialties": "",
    "parameterSizes": {}
  },
  {
    "id": "harness-9",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Nous Research",
    "famousFor": "",
    "engineName": "Hermes",
    "harness": "Hermes",
    "form": "CLI",
    "note": "fine-tuned Llama & Qwen",
    "specialties": "",
    "parameterSizes": {}
  },
  {
    "id": "harness-10",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "OpenClaw Foundation",
    "famousFor": "",
    "engineName": "OpenClaw / Code",
    "harness": "OpenClaw / Code",
    "form": "CLI über Messenger",
    "note": "Austrian origin",
    "specialties": "",
    "parameterSizes": {}
  },
  {
    "id": "harness-11",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Pydantic AI",
    "famousFor": "",
    "engineName": "Pyd.-AI Harness",
    "harness": "Pyd.-AI Harness",
    "form": "SDK",
    "note": "UK origin",
    "specialties": "",
    "parameterSizes": {}
  },
  {
    "id": "harness-12",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Replit",
    "famousFor": "",
    "engineName": "Replit Agent",
    "harness": "Replit Agent",
    "form": "Web",
    "note": "",
    "specialties": "",
    "parameterSizes": {}
  },
  {
    "id": "harness-13",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Sourcegraph",
    "famousFor": "",
    "engineName": "Amp +CodyAssist.",
    "harness": "Amp +CodyAssist.",
    "form": "CLI + IDE",
    "note": "",
    "specialties": "",
    "parameterSizes": {}
  },
  {
    "id": "harness-14",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Warp",
    "famousFor": "",
    "engineName": "Warp+Factories",
    "harness": "Warp+Factories",
    "form": "CLI / IDE-Hybrid",
    "note": "",
    "specialties": "",
    "parameterSizes": {}
  },
  {
    "id": "harness-15",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Zed Industries",
    "famousFor": "",
    "engineName": "Zed +Threads",
    "harness": "Zed +Threads",
    "form": "IDE",
    "note": "",
    "specialties": "",
    "parameterSizes": {}
  },
  {
    "id": "harness-16",
    "group": "harness",
    "country": "Israel",
    "countryFlag": "🇮🇱",
    "creator": "Qodo",
    "famousFor": "",
    "engineName": "Gen / Review",
    "harness": "Gen / Review",
    "form": "IDE + CLI + Git",
    "note": "formerly CodiumAI",
    "specialties": "",
    "parameterSizes": {}
  },
  {
    "id": "harness-17",
    "group": "harness",
    "country": "Singapore",
    "countryFlag": "🇸🇬",
    "creator": "Butterfly Effect",
    "famousFor": "",
    "engineName": "Manus",
    "harness": "Manus",
    "form": "Web",
    "note": "China origin",
    "specialties": "",
    "parameterSizes": {}
  }
];
