import { LabEntry } from '../types';

export const RAW_LAB_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR8QbYqPYx_PnohNVTT-hAU-NkOt9hVh-INeH_SJPwoYJpoRsBUGdmanYRZiz3ll1J0scf5U_vju3nG/pub?gid=355721692&single=true&output=csv';

export const DIRECT_EXPORT_LAB_CSV_URL = 'https://docs.google.com/spreadsheets/d/1Meep9uT4Q2qRWaBM1Bwu4ZnYNB0J51ib-hP1OsOOCuI/export?format=csv&gid=355721692';

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
      "singularity": "Fable (Mythos)",
      "godTier": ""
    },
    "subscriptionTiers": "Pro, Max, Team, Enterprise",
    "harnessSdk": "Claude SDK +Managed Agents",
    "dailyAgent": "Claude Duet",
    "codingAgent": "Claude Code & Cowork"
  },
  {
    "id": "google",
    "group": "top10",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Google",
    "famousFor": "YouTube, Android",
    "engineName": "Gemini & Notebook",
    "weightsType": "hybrid",
    "openWeights": {
      "small": true,
      "medium": false,
      "large": false,
      "colossal": false,
      "singularity": false
    },
    "parameterSizes": {
      "small": "Gemma",
      "medium": "Flash-Lite",
      "large": "Flash (Cyber)",
      "massive": "",
      "colossal": "Pro",
      "planetary": "",
      "singularity": "Argon",
      "godTier": ""
    },
    "subscriptionTiers": "Plus, Pro, Ultra",
    "harnessSdk": "Antigravity +Jules Async Engine",
    "dailyAgent": "Spark; Deep Research",
    "codingAgent": "Jules Tools; Antigravity; Build"
  },
  {
    "id": "meta",
    "group": "top10",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Meta",
    "famousFor": "Facebook, Instagram, WhatsApp",
    "engineName": "Muse",
    "weightsType": "hybrid",
    "openWeights": {
      "small": true,
      "large": false,
      "colossal": false,
      "singularity": false
    },
    "parameterSizes": {
      "small": "Glimmer",
      "medium": "",
      "large": "Spark",
      "massive": "",
      "colossal": "Wonder",
      "planetary": "",
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
    "famousFor": "AI- & Graphics Chips",
    "engineName": "Nemotron",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "medium": true,
      "colossal": true
    },
    "parameterSizes": {
      "small": "Lightning",
      "medium": "Bolt; Super",
      "large": "",
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
    "famousFor": "",
    "engineName": "ChatGPT",
    "weightsType": "hybrid",
    "openWeights": {
      "small": true,
      "large": false,
      "massive": false,
      "planetary": false,
      "singularity": false
    },
    "parameterSizes": {
      "small": "gpt-oss",
      "medium": "",
      "large": "Luna",
      "massive": "Terra",
      "colossal": "",
      "planetary": "Sol (Cyber)",
      "singularity": "Astra",
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
    "creator": "SpaceXAI",
    "famousFor": "Tesla, Twitter",
    "engineName": "Grok",
    "weightsType": "hybrid",
    "openWeights": {
      "medium": false,
      "massive": true,
      "colossal": false
    },
    "parameterSizes": {
      "small": "",
      "medium": "v0",
      "large": "",
      "massive": "v1 - v2",
      "colossal": "v3 - v4",
      "planetary": "",
      "singularity": "",
      "godTier": ""
    },
    "subscriptionTiers": "Supergrok Lite, Plus, Heavy, Bus., Ent.",
    "harnessSdk": "Cursor Engine",
    "dailyAgent": "Grok Bot",
    "codingAgent": "Cursor Agent, Grok Build"
  },
  {
    "id": "alibaba",
    "group": "top10",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "Alibaba",
    "famousFor": "Chinas Amazon / Chinas Amazon",
    "engineName": "Qwen / Qwen Coder",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "medium": true,
      "large": true,
      "massive": true,
      "planetary": true
    },
    "parameterSizes": {
      "small": "27B / v2,5",
      "medium": "Next",
      "large": "Flash",
      "massive": "Plus / v3",
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
    "id": "deepseek",
    "group": "top10",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "DeepSeek",
    "famousFor": "",
    "engineName": "DeepSeek",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "massive": true,
      "colossal": true,
      "planetary": true
    },
    "parameterSizes": {
      "small": "",
      "medium": "",
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
      "medium": true,
      "large": false,
      "colossal": true,
      "planetary": true
    },
    "parameterSizes": {
      "small": "",
      "medium": "",
      "large": "K1",
      "massive": "",
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
    "creator": "Z.ai / Zhipu",
    "famousFor": "",
    "engineName": "GLM 5",
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
    "famousFor": "Alexa, Kiro on AWS",
    "weightsType": "closed",
    "openWeights": {
      "small": false,
      "medium": false,
      "massive": false
    },
    "parameterSizes": {
      "small": "Micro; Lite; Sonic",
      "medium": "Omni; Pro",
      "large": "",
      "massive": "Premier",
      "colossal": "",
      "planetary": ""
    },
    "specialties": "Alexa, Kiro on AWS"
  },
  {
    "id": "contender-2",
    "group": "contender",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Inception",
    "engineName": "Mercury",
    "famousFor": "",
    "weightsType": "closed",
    "openWeights": {
      "medium": false,
      "large": false
    },
    "parameterSizes": {
      "small": "",
      "medium": "v1",
      "large": "v2",
      "massive": "",
      "colossal": "",
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
    "famousFor": "Copilot",
    "weightsType": "hybrid",
    "openWeights": {
      "small": true,
      "large": false,
      "colossal": false
    },
    "parameterSizes": {
      "small": "Phi",
      "medium": "",
      "large": "Flash",
      "massive": "",
      "colossal": "Thinking",
      "planetary": ""
    },
    "specialties": "Copilot"
  },
  {
    "id": "contender-4",
    "group": "contender",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Reflection",
    "engineName": "Beam",
    "famousFor": "https://reflection.ai/blog/introducing-beam",
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
    "specialties": "https://reflection.ai/blog/introducing-beam"
  },
  {
    "id": "contender-5",
    "group": "contender",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Thinking Machines",
    "engineName": "Inkling",
    "famousFor": "",
    "weightsType": "open",
    "openWeights": {
      "massive": true,
      "colossal": true
    },
    "parameterSizes": {
      "small": "",
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
    "famousFor": "",
    "weightsType": "closed",
    "openWeights": {
      "small": false
    },
    "parameterSizes": {
      "small": "incoming 2026",
      "medium": "",
      "large": "",
      "massive": "",
      "colossal": "",
      "planetary": ""
    },
    "specialties": ""
  },
  {
    "id": "contender-7",
    "group": "contender",
    "country": "Canada",
    "countryFlag": "🇨🇦",
    "creator": "Cohere",
    "engineName": "-",
    "famousFor": "merged with Aleph-Alpha",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "medium": true,
      "large": true
    },
    "parameterSizes": {
      "small": "Command R",
      "medium": "Kolibri",
      "large": "Command A",
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
    "creator": "Ant Group / InclusionAI",
    "engineName": "Ling",
    "famousFor": "",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "medium": true,
      "massive": true
    },
    "parameterSizes": {
      "small": "Tiny; Mini; Lite",
      "medium": "Flash",
      "large": "",
      "massive": "Plus",
      "colossal": "",
      "planetary": ""
    },
    "specialties": ""
  },
  {
    "id": "contender-9",
    "group": "contender",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "Baidu",
    "engineName": "ERNIE",
    "famousFor": "Chinas Google",
    "weightsType": "hybrid",
    "openWeights": {
      "small": true,
      "medium": false,
      "large": false,
      "massive": false,
      "colossal": false
    },
    "parameterSizes": {
      "small": "ERNIE",
      "medium": "v1",
      "large": "v2 - v3",
      "massive": "v4",
      "colossal": "v5",
      "planetary": ""
    },
    "specialties": "Chinas Google"
  },
  {
    "id": "contender-10",
    "group": "contender",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "Meituan",
    "engineName": "LongCat",
    "famousFor": "",
    "weightsType": "open",
    "openWeights": {
      "medium": true,
      "colossal": true,
      "planetary": true
    },
    "parameterSizes": {
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
    "weightsType": "open",
    "openWeights": {
      "large": true,
      "massive": true
    },
    "parameterSizes": {
      "small": "",
      "medium": "",
      "large": "v2",
      "massive": "v1; v3",
      "colossal": "",
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
    "weightsType": "open",
    "openWeights": {
      "medium": true,
      "massive": true,
      "planetary": true
    },
    "parameterSizes": {
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
    "weightsType": "closed",
    "openWeights": {
      "medium": false,
      "massive": false
    },
    "parameterSizes": {
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
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "medium": true,
      "large": true,
      "colossal": true
    },
    "parameterSizes": {
      "small": "VL",
      "medium": "v1",
      "large": "v3",
      "massive": "",
      "colossal": "v2; v5",
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
    "famousFor": "Chinas WhatsApp",
    "weightsType": "open",
    "openWeights": {
      "medium": true,
      "large": true,
      "massive": true,
      "colossal": true
    },
    "parameterSizes": {
      "small": "",
      "medium": "v1",
      "large": "v2",
      "massive": "v3",
      "colossal": "v4",
      "planetary": ""
    },
    "specialties": "Chinas WhatsApp"
  },
  {
    "id": "contender-16",
    "group": "contender",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "Xiaomi",
    "engineName": "MiMo",
    "famousFor": "",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "massive": true,
      "colossal": true
    },
    "parameterSizes": {
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
    "country": "French",
    "countryFlag": "🇫🇷",
    "creator": "MIstral AI",
    "engineName": "Mistral",
    "famousFor": "DeepResearch",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "large": true,
      "colossal": true
    },
    "parameterSizes": {
      "small": "Small",
      "medium": "",
      "large": "Medium",
      "massive": "",
      "colossal": "Large",
      "planetary": ""
    },
    "specialties": "DeepResearch"
  },
  {
    "id": "contender-18",
    "group": "contender",
    "country": "Israel",
    "countryFlag": "🇮🇱",
    "creator": "AI21 Labs",
    "engineName": "Jamba",
    "famousFor": "",
    "weightsType": "open",
    "openWeights": {
      "medium": true,
      "massive": true
    },
    "parameterSizes": {
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
    "famousFor": "Wide Research",
    "weightsType": "closed",
    "openWeights": {
      "medium": false,
      "massive": false
    },
    "parameterSizes": {
      "small": "",
      "medium": "Flash",
      "large": "",
      "massive": "Pro",
      "colossal": "",
      "planetary": ""
    },
    "specialties": "Wide Research"
  },
  {
    "id": "contender-20",
    "group": "contender",
    "country": "South Korea",
    "countryFlag": "🇰🇷",
    "creator": "LG AI Research",
    "engineName": "K-EXAONE",
    "famousFor": "",
    "weightsType": "open",
    "openWeights": {
      "large": true,
      "colossal": true
    },
    "parameterSizes": {
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
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "medium": true,
      "massive": true
    },
    "parameterSizes": {
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
    "weightsType": "open",
    "openWeights": {
      "colossal": true
    },
    "parameterSizes": {
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
    "famousFor": "Reasoning",
    "weightsType": "hybrid",
    "openWeights": {
      "small": true,
      "medium": true,
      "large": true,
      "massive": false
    },
    "parameterSizes": {
      "small": "Mini",
      "medium": "v1; v3",
      "large": "v2",
      "massive": "v4",
      "colossal": "",
      "planetary": ""
    },
    "specialties": "Reasoning"
  },
  {
    "id": "contender-24",
    "group": "contender",
    "country": "UAE",
    "countryFlag": "🇦🇪",
    "creator": "MBZUAI*",
    "engineName": "K2",
    "famousFor": "*Institute of Foundation Models",
    "weightsType": "open",
    "openWeights": {
      "small": true
    },
    "parameterSizes": {
      "small": "Think; Horizon",
      "medium": "",
      "large": "",
      "massive": "",
      "colossal": "",
      "planetary": ""
    },
    "specialties": "*Institute of Foundation Models"
  },
  {
    "id": "contender-25",
    "group": "contender",
    "country": "UAE",
    "countryFlag": "🇦🇪",
    "creator": "",
    "engineName": "",
    "famousFor": "",
    "weightsType": "open",
    "parameterSizes": {
      "small": "",
      "medium": "",
      "large": "",
      "massive": "",
      "colossal": "",
      "planetary": ""
    },
    "specialties": ""
  },
  {
    "id": "tweaker-1",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Apodex (Alibaba)",
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
      "colossal": ""
    },
    "specialties": "Based on Qwen"
  },
  {
    "id": "tweaker-2",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Apple (Google)",
    "engineName": "Siri AI",
    "basedOn": "Gemini",
    "famousFor": "Based on Gemini",
    "weightsType": "hybrid",
    "openWeights": {
      "small": true,
      "medium": false
    },
    "parameterSizes": {
      "small": "OpenELM",
      "medium": "Gemini trained AFM model famility only available on EN locales for now, DE locale end of 2026",
      "large": "",
      "massive": "",
      "colossal": ""
    },
    "specialties": "Based on Gemini"
  },
  {
    "id": "tweaker-3",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Circuit & Chisel / Unbiased.ai",
    "engineName": "Pareto",
    "basedOn": "various",
    "famousFor": "Based on various",
    "weightsType": "closed",
    "openWeights": {
      "small": false
    },
    "parameterSizes": {
      "small": "orchestrates a mix of openweight models",
      "medium": "",
      "large": "",
      "massive": "",
      "colossal": ""
    },
    "specialties": "Based on various"
  },
  {
    "id": "tweaker-4",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "DeepReinforce (Alibaba, Google)",
    "engineName": "Ornith",
    "basedOn": "Qwen / Gemma",
    "famousFor": "Based on Qwen / Gemma",
    "weightsType": "open",
    "openWeights": {
      "small": true
    },
    "parameterSizes": {
      "small": "v1",
      "medium": "",
      "large": "",
      "massive": "",
      "colossal": ""
    },
    "specialties": "Based on Qwen / Gemma"
  },
  {
    "id": "tweaker-5",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Perplexity (Meta, Mistral)",
    "engineName": "Sonar",
    "basedOn": "Llama, Mistral",
    "famousFor": "Based on Llama, Mistral",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "massive": true
    },
    "parameterSizes": {
      "small": "Llama, Mistral",
      "medium": "",
      "large": "",
      "massive": "Llama 3.1",
      "colossal": ""
    },
    "specialties": "Based on Llama, Mistral"
  },
  {
    "id": "tweaker-6",
    "group": "tweakers",
    "country": "Japan",
    "countryFlag": "🇯🇵",
    "creator": "Sakana AI (Moonshot, Alibaba)",
    "engineName": "Sakana",
    "basedOn": "Kimi, Qwen",
    "famousFor": "Based on Kimi, Qwen",
    "weightsType": "open",
    "openWeights": {
      "colossal": true
    },
    "parameterSizes": {
      "small": "",
      "medium": "",
      "large": "",
      "massive": "",
      "colossal": "Namazu; Fugu"
    },
    "specialties": "Based on Kimi, Qwen"
  },
  {
    "id": "tweaker-7",
    "group": "tweakers",
    "country": "Saudi Arabia",
    "countryFlag": "🇸🇦",
    "creator": "HUMAIN (MiniMax)",
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
      "colossal": ""
    },
    "specialties": "Based on MiniMax"
  },
  {
    "id": "tweaker-8",
    "group": "tweakers",
    "country": "Spain",
    "countryFlag": "🇪🇸",
    "creator": "Multiverse Computing (Z.ai)",
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
      "colossal": ""
    },
    "specialties": "Based on GLM"
  },
  {
    "id": "tweaker-extra-1",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Abacus AI",
    "engineName": "Abacus AI",
    "basedOn": "Alibaba (Qwen)",
    "famousFor": "The Smaug series re-spins Qwen.",
    "weightsType": "open",
    "openWeights": {
      "small": true
    },
    "parameterSizes": {
      "small": "Alibaba (Qwen)"
    },
    "specialties": "The Smaug series re-spins Qwen."
  },
  {
    "id": "tweaker-extra-2",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Arcee AI",
    "engineName": "Arcee AI",
    "basedOn": "Meta / Mistral / Alibaba",
    "famousFor": "Evolutionary model merging for domain-adapted Llama, Mistral, and Qwen re-spins (SuperNova, Virtuoso).",
    "weightsType": "open",
    "openWeights": {
      "small": true
    },
    "parameterSizes": {
      "small": "Meta / Mistral / Alibaba"
    },
    "specialties": "Evolutionary model merging for domain-adapted Llama, Mistral, and Qwen re-spins (SuperNova, Virtuoso)."
  },
  {
    "id": "tweaker-extra-3",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Cognitive Computations",
    "engineName": "Cognitive Computations",
    "basedOn": "Meta / Mistral / Alibaba",
    "famousFor": "Dolphin family for uncensored post-trained re-spins of Llama, Mistral, and Qwen.",
    "weightsType": "open",
    "openWeights": {
      "small": true
    },
    "parameterSizes": {
      "small": "Meta / Mistral / Alibaba"
    },
    "specialties": "Dolphin family for uncensored post-trained re-spins of Llama, Mistral, and Qwen."
  },
  {
    "id": "tweaker-extra-4",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Nous Research",
    "engineName": "Nous Research",
    "basedOn": "Meta / Alibaba",
    "famousFor": "Hermes Agent family of fine-tuned Llama and Qwen re-spins.",
    "weightsType": "open",
    "openWeights": {
      "small": true
    },
    "parameterSizes": {
      "small": "Meta / Alibaba"
    },
    "specialties": "Hermes Agent family of fine-tuned Llama and Qwen re-spins."
  },
  {
    "id": "tweaker-extra-5",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Fireworks AI",
    "engineName": "Fireworks AI",
    "basedOn": "Moonshot (Kimi)",
    "famousFor": "Kimi K3 efficiency re-spin named Ember.",
    "weightsType": "open",
    "openWeights": {
      "small": true
    },
    "parameterSizes": {
      "small": "Moonshot (Kimi)"
    },
    "specialties": "Kimi K3 efficiency re-spin named Ember."
  },
  {
    "id": "small-1",
    "group": "small",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Hugging Face",
    "engineName": "SmolLM",
    "famousFor": "",
    "weightsType": "open",
    "openWeights": {
      "micro": true
    },
    "parameterSizes": {
      "micro": "SmolLM",
      "mini": "",
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
    "famousFor": "Watson, SPSS",
    "weightsType": "open",
    "openWeights": {
      "micro": true
    },
    "parameterSizes": {
      "micro": "Granite",
      "mini": "",
      "tiny": "",
      "small": "",
      "medium": "",
      "large": ""
    },
    "specialties": "Watson, SPSS"
  },
  {
    "id": "small-3",
    "group": "small",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Liquid AI",
    "engineName": "LFM",
    "famousFor": "",
    "weightsType": "hybrid",
    "openWeights": {
      "micro": true,
      "medium": false
    },
    "parameterSizes": {
      "micro": "v2",
      "mini": "",
      "tiny": "",
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
    "weightsType": "closed",
    "openWeights": {
      "micro": false,
      "tiny": false
    },
    "parameterSizes": {
      "micro": "v1",
      "mini": "",
      "tiny": "v2",
      "small": "",
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
    "weightsType": "open",
    "openWeights": {
      "mini": true,
      "small": true
    },
    "parameterSizes": {
      "micro": "",
      "mini": "v1",
      "tiny": "",
      "small": "Qwen3.x re-spins",
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
    "weightsType": "hybrid",
    "openWeights": {
      "tiny": true,
      "medium": false
    },
    "parameterSizes": {
      "micro": "",
      "mini": "",
      "tiny": "v1",
      "small": "",
      "medium": "Lightning & Large",
      "large": ""
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
    "famousFor": "TikTok",
    "weightsType": "hybrid",
    "openWeights": {
      "tiny": true,
      "small": false,
      "medium": false,
      "large": false
    },
    "parameterSizes": {
      "micro": "",
      "mini": "",
      "tiny": "X / Coder",
      "small": "Mini & OSS",
      "medium": "Lite & Code",
      "large": "Pro"
    },
    "specialties": "TikTok"
  },
  {
    "id": "small-10",
    "group": "small",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "iFlytek",
    "engineName": "Spark",
    "famousFor": "",
    "weightsType": "hybrid",
    "openWeights": {
      "mini": true,
      "medium": false,
      "large": false
    },
    "parameterSizes": {
      "micro": "",
      "mini": "V1 - V4",
      "tiny": "",
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
    "weightsType": "open",
    "openWeights": {
      "mini": true
    },
    "parameterSizes": {
      "micro": "",
      "mini": "v1 - v4",
      "tiny": "",
      "small": "",
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
    "weightsType": "open",
    "openWeights": {
      "mini": true,
      "medium": true
    },
    "parameterSizes": {
      "micro": "",
      "mini": "LM 1 - LM 2",
      "tiny": "",
      "small": "",
      "medium": "LM 3; VL",
      "large": ""
    },
    "specialties": "big GLM 5.x re-spin"
  },
  {
    "id": "small-13",
    "group": "small",
    "country": "India",
    "countryFlag": "🌐",
    "creator": "Sarvam AI",
    "engineName": "Sarvam",
    "famousFor": "",
    "weightsType": "open",
    "openWeights": {
      "mini": true,
      "small": true
    },
    "parameterSizes": {
      "micro": "",
      "mini": "v1",
      "tiny": "",
      "small": "v2",
      "medium": "",
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
    "engineName": "Gauss 1",
    "famousFor": "for Galaxy AI",
    "weightsType": "closed",
    "openWeights": {
      "mini": false,
      "tiny": false,
      "medium": false,
      "large": false
    },
    "parameterSizes": {
      "micro": "",
      "mini": "Image",
      "tiny": "Language",
      "small": "",
      "medium": "Cloud Server",
      "large": "Code"
    },
    "specialties": "for Galaxy AI"
  },
  {
    "id": "small-16",
    "group": "small",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "Alibaba",
    "engineName": "Qwen",
    "famousFor": "community driven",
    "weightsType": "open",
    "openWeights": {
      "micro": true
    },
    "parameterSizes": {
      "micro": "v1 - v4",
      "mini": "",
      "tiny": "",
      "small": "",
      "medium": "",
      "large": ""
    },
    "specialties": "community driven"
  },
  {
    "id": "small-17",
    "group": "small",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "DeepSeek",
    "engineName": "R1 Distill",
    "famousFor": "community driven",
    "weightsType": "open",
    "openWeights": {
      "mini": true,
      "medium": true
    },
    "parameterSizes": {
      "micro": "",
      "mini": "Qwen based",
      "tiny": "",
      "small": "",
      "medium": "Llama based",
      "large": ""
    },
    "specialties": "community driven"
  },
  {
    "id": "small-18",
    "group": "small",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Google",
    "engineName": "Gemma",
    "famousFor": "for Android",
    "weightsType": "open",
    "openWeights": {
      "micro": true,
      "mini": true,
      "small": true
    },
    "parameterSizes": {
      "micro": "v3",
      "mini": "v1 - v4",
      "tiny": "",
      "small": "v2 - v4",
      "medium": "",
      "large": ""
    },
    "specialties": "for Android"
  },
  {
    "id": "small-19",
    "group": "small",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Meta",
    "engineName": "Llama",
    "famousFor": "discontinued",
    "weightsType": "open",
    "openWeights": {
      "mini": true
    },
    "parameterSizes": {
      "micro": "",
      "mini": "v1 - v3",
      "tiny": "",
      "small": "",
      "medium": "",
      "large": ""
    },
    "specialties": "discontinued"
  },
  {
    "id": "small-20",
    "group": "small",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Microsoft",
    "engineName": "Phi (Mini)",
    "famousFor": "for Copilot",
    "weightsType": "open",
    "openWeights": {
      "mini": true,
      "tiny": true,
      "small": true
    },
    "parameterSizes": {
      "micro": "",
      "mini": "v1 - v2",
      "tiny": "v4",
      "small": "v3",
      "medium": "",
      "large": ""
    },
    "specialties": "for Copilot"
  },
  {
    "id": "small-21",
    "group": "small",
    "country": "French",
    "countryFlag": "🇫🇷",
    "creator": "Mistral AI",
    "engineName": "Ministral",
    "famousFor": "",
    "weightsType": "open",
    "openWeights": {
      "tiny": true,
      "small": true
    },
    "parameterSizes": {
      "micro": "",
      "mini": "",
      "tiny": "v1",
      "small": "v3",
      "medium": "",
      "large": ""
    },
    "specialties": ""
  },
  {
    "id": "harness-1",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Aider",
    "famousFor": "Canadian origin (Paul Gauthier)",
    "engineName": "Aider Git Harness",
    "harness": "Aider Git Harness",
    "form": "CLI",
    "note": "Canadian origin (Paul Gauthier)",
    "parameterSizes": {},
    "specialties": "CLI (Canadian origin (Paul Gauthier))"
  },
  {
    "id": "harness-2",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "All Hands AI",
    "famousFor": "formerly OpenDevin",
    "engineName": "OpenHands",
    "harness": "OpenHands",
    "form": "CLI + Web SDK",
    "note": "formerly OpenDevin",
    "parameterSizes": {},
    "specialties": "CLI + Web SDK (formerly OpenDevin)"
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
    "parameterSizes": {},
    "specialties": "IDE"
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
    "parameterSizes": {},
    "specialties": "IDE + CLI + Git"
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
    "parameterSizes": {},
    "specialties": "Web"
  },
  {
    "id": "harness-6",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Cognition AI",
    "famousFor": "formerly Windsurf",
    "engineName": "Devin",
    "harness": "Devin",
    "form": "IDE + CLI + Web",
    "note": "formerly Windsurf",
    "parameterSizes": {},
    "specialties": "IDE + CLI + Web (formerly Windsurf)"
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
    "parameterSizes": {},
    "specialties": "CLI"
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
    "parameterSizes": {},
    "specialties": "SDK"
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
    "note": "",
    "parameterSizes": {},
    "specialties": "CLI"
  },
  {
    "id": "harness-10",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "OpenClaw Foundation",
    "famousFor": "Austrian origin",
    "engineName": "OpenClaw / Code",
    "harness": "OpenClaw / Code",
    "form": "CLI über Messenger",
    "note": "Austrian origin",
    "parameterSizes": {},
    "specialties": "CLI über Messenger (Austrian origin)"
  },
  {
    "id": "harness-11",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Pydantic AI",
    "famousFor": "UK origin",
    "engineName": "Pyd.-AI Harness",
    "harness": "Pyd.-AI Harness",
    "form": "SDK",
    "note": "UK origin",
    "parameterSizes": {},
    "specialties": "SDK (UK origin)"
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
    "parameterSizes": {},
    "specialties": "Web"
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
    "parameterSizes": {},
    "specialties": "CLI + IDE"
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
    "parameterSizes": {},
    "specialties": "CLI / IDE-Hybrid"
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
    "parameterSizes": {},
    "specialties": "IDE"
  },
  {
    "id": "harness-16",
    "group": "harness",
    "country": "Israel",
    "countryFlag": "🇮🇱",
    "creator": "Qodo",
    "famousFor": "formerly CodiumAI",
    "engineName": "Gen / Review",
    "harness": "Gen / Review",
    "form": "IDE + CLI + Git",
    "note": "formerly CodiumAI",
    "parameterSizes": {},
    "specialties": "IDE + CLI + Git (formerly CodiumAI)"
  },
  {
    "id": "harness-17",
    "group": "harness",
    "country": "Singapur",
    "countryFlag": "🌐",
    "creator": "Butterfly Effect",
    "famousFor": "China origin",
    "engineName": "Manus",
    "harness": "Manus",
    "form": "Web",
    "note": "China origin",
    "parameterSizes": {},
    "specialties": "Web (China origin)"
  }
];
