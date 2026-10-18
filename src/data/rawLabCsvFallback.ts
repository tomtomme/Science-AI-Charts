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
      "medium": "Instant; Haiku",
      "massive": "Sonnet",
      "planetary": "Opus",
      "singularity": "Fable; Mythos"
    },
    "subscriptionTiers": "Pro, Max, Team, Enterprise",
    "harnessSdk": "Claude SDK +Managed Agents",
    "dailyAgent": "Claude Cowork",
    "codingAgent": "Claude Code"
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
      "colossal": "Pro",
      "singularity": "Argon/Carbon"
    },
    "subscriptionTiers": "Plus, Pro, Ultra",
    "harnessSdk": "Antigravity +Jules Async Engine",
    "dailyAgent": "Spark; Deep Research; Build",
    "codingAgent": "Jules Tools; Antigravity"
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
      "large": "Spark",
      "colossal": "Wonder",
      "singularity": "Wonder Full"
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
      "colossal": "Ultra"
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
      "large": "Instant; Luna",
      "massive": "Terra",
      "planetary": "Sol; Cyber",
      "singularity": "Astra; Bel"
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
      "medium": "0",
      "massive": "1; 2",
      "colossal": "3; 4"
    },
    "subscriptionTiers": "Supergrok Lite, Plus, Heavy, Bus., Ent.",
    "harnessSdk": "Cursor Engine",
    "dailyAgent": "Grok Bot, Grok Build",
    "codingAgent": "Cursor Agent"
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
      "small": "27B / 2.5",
      "medium": "Next",
      "large": "Flash",
      "massive": "Plus / 3",
      "planetary": "Max"
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
      "small": "Lite; Distill",
      "massive": "Flash",
      "colossal": "R1",
      "planetary": "Pro"
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
      "medium": "Linear",
      "large": "K1",
      "colossal": "K2",
      "planetary": "K3"
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
      "large": "V",
      "massive": "Flash",
      "colossal": "GLM"
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
      "massive": "Premier"
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
      "medium": "1",
      "large": "2"
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
      "large": "Flash",
      "colossal": "Thinking"
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
      "massive": "1"
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
      "massive": "Small",
      "colossal": "Inkling"
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
      "small": "incoming 2026"
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
      "large": "Command A"
    },
    "specialties": "merged with Aleph-Alpha"
  },
  {
    "id": "contender-8",
    "group": "contender",
    "country": "China",
    "countryFlag": "🇨🇳",
    "creator": "Ant Group/InclusionAI",
    "engineName": "Ling",
    "famousFor": "",
    "weightsType": "open",
    "openWeights": {
      "small": true,
      "medium": true,
      "massive": true
    },
    "parameterSizes": {
      "small": "3 Tiny; 2 Mini; 1 Lite",
      "medium": "3 Flash",
      "massive": "3.1 Flash; 2 Plus"
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
      "medium": "1",
      "large": "2; 3",
      "massive": "4",
      "colossal": "5"
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
      "medium": "Flash-Lite",
      "colossal": "Flash-Thinking",
      "planetary": "2"
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
      "large": "2",
      "massive": "1; 3"
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
      "medium": "Mini",
      "massive": "Pro",
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
      "medium": "1",
      "massive": "2"
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
      "medium": "1",
      "large": "3",
      "colossal": "2; 5"
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
      "medium": "1",
      "large": "2",
      "massive": "3",
      "colossal": "4"
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
      "massive": "Flash",
      "colossal": "Pro"
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
      "large": "Medium",
      "colossal": "Large"
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
      "medium": "Mini",
      "massive": "Large"
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
      "medium": "Flash",
      "massive": "Pro"
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
      "large": "1",
      "colossal": "2"
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
      "small": "2",
      "medium": "1",
      "massive": "3"
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
      "colossal": "K2"
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
      "medium": "1; 3",
      "large": "2",
      "massive": "4"
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
      "small": "Think; Horizon"
    },
    "specialties": "*Institute of Foundation Models"
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
      "massive": "1"
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
      "medium": "Gemini trained AFM model famility only available on EN locales for now, DE locale end of 2026"
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
      "small": "orchestrates a mix of openweight models"
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
      "small": "1"
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
      "massive": "Llama 3.1"
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
      "small": "1",
      "medium": "2",
      "massive": "3"
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
      "medium": "HyperNova",
      "massive": "Quasar"
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
    "basedOn": "Alibaba / Qwen",
    "famousFor": "The Smaug series re-spins Qwen.",
    "weightsType": "open",
    "openWeights": {
      "small": true
    },
    "parameterSizes": {
      "small": "Alibaba / Qwen"
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
    "famousFor": "Evolutionary model merging for domain-adapted Llama, Mistral, and Qwen re-spins.",
    "weightsType": "open",
    "openWeights": {
      "small": true
    },
    "parameterSizes": {
      "small": "Meta / Mistral / Alibaba"
    },
    "specialties": "Evolutionary model merging for domain-adapted Llama, Mistral, and Qwen re-spins."
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
    "famousFor": "Hermes Agent family of fine-tuned Llama and Qwen re-spins",
    "weightsType": "open",
    "openWeights": {
      "small": true
    },
    "parameterSizes": {
      "small": "Meta / Alibaba"
    },
    "specialties": "Hermes Agent family of fine-tuned Llama and Qwen re-spins"
  },
  {
    "id": "tweaker-extra-5",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Fireworks AI",
    "engineName": "Fireworks AI",
    "basedOn": "Moonshot / Kimi",
    "famousFor": "Kimi K3 efficiency re-spin named Ember",
    "weightsType": "open",
    "openWeights": {
      "small": true
    },
    "parameterSizes": {
      "small": "Moonshot / Kimi"
    },
    "specialties": "Kimi K3 efficiency re-spin named Ember"
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
      "micro": "SmolLM"
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
      "micro": "Granite"
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
      "micro": "2",
      "medium": "1"
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
      "micro": "1",
      "tiny": "2"
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
      "tiny": "Fast Apply"
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
      "mini": "v1",
      "small": "Qwen3.x re-spins"
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
      "tiny": "1",
      "medium": "Lightning & Large"
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
      "mini": "V1 to 4",
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
      "mini": "1 to 4"
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
      "mini": "LM 1 & 2",
      "medium": "LM 3; VL"
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
    "weightsType": "open",
    "openWeights": {
      "mini": true,
      "small": true
    },
    "parameterSizes": {
      "mini": "1",
      "small": "2"
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
      "mini": "Image",
      "tiny": "Language",
      "medium": "Cloud Server",
      "large": "Code"
    },
    "specialties": "for Galaxy AI"
  },
  {
    "id": "small-16",
    "group": "small",
    "country": "Small LLMs from Labs that also have BIG models; not counted again",
    "countryFlag": "🌐",
    "creator": "Alibaba",
    "engineName": "Qwen",
    "famousFor": "community driven",
    "weightsType": "open",
    "openWeights": {
      "micro": true
    },
    "parameterSizes": {
      "micro": "1 to 4"
    },
    "specialties": "community driven"
  },
  {
    "id": "small-17",
    "group": "small",
    "country": "Small LLMs from Labs that also have BIG models; not counted again",
    "countryFlag": "🌐",
    "creator": "DeepSeek",
    "engineName": "R1 Distill",
    "famousFor": "community driven",
    "weightsType": "open",
    "openWeights": {
      "mini": true,
      "medium": true
    },
    "parameterSizes": {
      "mini": "Qwen based",
      "medium": "Llama based"
    },
    "specialties": "community driven"
  },
  {
    "id": "small-18",
    "group": "small",
    "country": "Small LLMs from Labs that also have BIG models; not counted again",
    "countryFlag": "🌐",
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
      "micro": "3",
      "mini": "1 to 4",
      "small": "2 to 4"
    },
    "specialties": "for Android"
  },
  {
    "id": "small-19",
    "group": "small",
    "country": "Small LLMs from Labs that also have BIG models; not counted again",
    "countryFlag": "🌐",
    "creator": "Meta",
    "engineName": "Llama",
    "famousFor": "discontinued",
    "weightsType": "open",
    "openWeights": {
      "mini": true
    },
    "parameterSizes": {
      "mini": "1 to 3"
    },
    "specialties": "discontinued"
  },
  {
    "id": "small-20",
    "group": "small",
    "country": "Small LLMs from Labs that also have BIG models; not counted again",
    "countryFlag": "🌐",
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
      "mini": "1 & 2",
      "tiny": "4",
      "small": "3"
    },
    "specialties": "for Copilot"
  },
  {
    "id": "small-21",
    "group": "small",
    "country": "Small LLMs from Labs that also have BIG models; not counted again",
    "countryFlag": "🌐",
    "creator": "Mistral AI",
    "engineName": "Ministral",
    "famousFor": "",
    "weightsType": "open",
    "openWeights": {
      "tiny": true,
      "small": true
    },
    "parameterSizes": {
      "tiny": "1",
      "small": "3"
    },
    "specialties": ""
  },
  {
    "id": "harness-1",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Aider",
    "engineName": "Aider",
    "famousFor": "Aider Git Harness",
    "harness": "Aider Git Harness",
    "form": "CLI",
    "note": "Canadian origin (Paul Gauthier)",
    "weightsType": "open",
    "openWeights": {},
    "parameterSizes": {}
  },
  {
    "id": "harness-2",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "All Hands AI",
    "engineName": "All Hands AI",
    "famousFor": "OpenHands",
    "harness": "OpenHands",
    "form": "CLI + Web SDK",
    "note": "formerly OpenDevin",
    "weightsType": "open",
    "openWeights": {},
    "parameterSizes": {}
  },
  {
    "id": "harness-3",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Augment Code",
    "engineName": "Augment Code",
    "famousFor": "Context Engine",
    "harness": "Context Engine",
    "form": "IDE",
    "note": "",
    "weightsType": "open",
    "openWeights": {},
    "parameterSizes": {}
  },
  {
    "id": "harness-4",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "CodeRabbit",
    "engineName": "CodeRabbit",
    "famousFor": "CodeRabbit",
    "harness": "CodeRabbit",
    "form": "IDE + CLI + Git",
    "note": "",
    "weightsType": "open",
    "openWeights": {},
    "parameterSizes": {}
  },
  {
    "id": "harness-5",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Coder",
    "engineName": "Coder",
    "famousFor": "Coder Agents",
    "harness": "Coder Agents",
    "form": "Web",
    "note": "",
    "weightsType": "open",
    "openWeights": {},
    "parameterSizes": {}
  },
  {
    "id": "harness-6",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Cognition AI",
    "engineName": "Cognition AI",
    "famousFor": "Devin",
    "harness": "Devin",
    "form": "IDE + CLI + Web",
    "note": "formerly Windsurf",
    "weightsType": "open",
    "openWeights": {},
    "parameterSizes": {}
  },
  {
    "id": "harness-7",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Factory AI",
    "engineName": "Factory AI",
    "famousFor": "Droid",
    "harness": "Droid",
    "form": "CLI",
    "note": "",
    "weightsType": "open",
    "openWeights": {},
    "parameterSizes": {}
  },
  {
    "id": "harness-8",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "LangChain",
    "engineName": "LangChain",
    "famousFor": "Deep Agents+LangGraph",
    "harness": "Deep Agents+LangGraph",
    "form": "SDK",
    "note": "",
    "weightsType": "open",
    "openWeights": {},
    "parameterSizes": {}
  },
  {
    "id": "harness-9",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Nous Research",
    "engineName": "Nous Research",
    "famousFor": "Hermes",
    "harness": "Hermes",
    "form": "CLI",
    "note": "",
    "weightsType": "open",
    "openWeights": {},
    "parameterSizes": {}
  },
  {
    "id": "harness-10",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "OpenClaw Foundation",
    "engineName": "OpenClaw Foundation",
    "famousFor": "OpenClaw/Code",
    "harness": "OpenClaw/Code",
    "form": "CLI über Messenger",
    "note": "Austrian origin",
    "weightsType": "open",
    "openWeights": {},
    "parameterSizes": {}
  },
  {
    "id": "harness-11",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Pydantic AI",
    "engineName": "Pydantic AI",
    "famousFor": "Pyd.-AI Harness",
    "harness": "Pyd.-AI Harness",
    "form": "SDK",
    "note": "UK origin",
    "weightsType": "open",
    "openWeights": {},
    "parameterSizes": {}
  },
  {
    "id": "harness-12",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Replit",
    "engineName": "Replit",
    "famousFor": "Replit Agent",
    "harness": "Replit Agent",
    "form": "Web",
    "note": "",
    "weightsType": "open",
    "openWeights": {},
    "parameterSizes": {}
  },
  {
    "id": "harness-13",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Sourcegraph",
    "engineName": "Sourcegraph",
    "famousFor": "Amp +CodyAssist.",
    "harness": "Amp +CodyAssist.",
    "form": "CLI + IDE",
    "note": "",
    "weightsType": "open",
    "openWeights": {},
    "parameterSizes": {}
  },
  {
    "id": "harness-14",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Warp",
    "engineName": "Warp",
    "famousFor": "Warp+Factories",
    "harness": "Warp+Factories",
    "form": "CLI/IDE-Hybrid",
    "note": "",
    "weightsType": "open",
    "openWeights": {},
    "parameterSizes": {}
  },
  {
    "id": "harness-15",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Zed Industries",
    "engineName": "Zed Industries",
    "famousFor": "Zed +Threads",
    "harness": "Zed +Threads",
    "form": "IDE",
    "note": "",
    "weightsType": "open",
    "openWeights": {},
    "parameterSizes": {}
  },
  {
    "id": "harness-16",
    "group": "harness",
    "country": "Israel",
    "countryFlag": "🇮🇱",
    "creator": "Qodo",
    "engineName": "Qodo",
    "famousFor": "Gen/Review",
    "harness": "Gen/Review",
    "form": "IDE + CLI + Git",
    "note": "formerly CodiumAI",
    "weightsType": "open",
    "openWeights": {},
    "parameterSizes": {}
  },
  {
    "id": "harness-17",
    "group": "harness",
    "country": "Singapur",
    "countryFlag": "🇸🇬",
    "creator": "Butterfly Effect",
    "engineName": "Butterfly Effect",
    "famousFor": "Manus",
    "harness": "Manus",
    "form": "Web",
    "note": "China origin",
    "weightsType": "open",
    "openWeights": {},
    "parameterSizes": {}
  }
];
