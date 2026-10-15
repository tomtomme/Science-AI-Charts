import { LabEntry } from "../types";

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
    "parameterSizes": {
      "small": "",
      "medium": "Instant; Haiku",
      "large": "",
      "massive": "Sonnet",
      "colossal": "",
      "planetary": "Opus",
      "singularity": "Fable; Mythos",
      "godTier": ""
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
    "engineName": "Gemini & NotebookLM",
    "parameterSizes": {
      "small": "Gemma",
      "medium": "Flash-Lite",
      "large": "Flash (Cyber)",
      "massive": "",
      "colossal": "Pro",
      "planetary": "",
      "singularity": "Argon/Carbon",
      "godTier": ""
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
    "engineName": "Muse / Llama 4",
    "parameterSizes": {
      "small": "Glimmer",
      "medium": "Scout",
      "large": "Spark",
      "massive": "Maverick",
      "colossal": "Wonder",
      "planetary": "Behemoth",
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
    "parameterSizes": {
      "small": "Lightning",
      "medium": "Super",
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
    "creator": "OpenAI / Microsoft",
    "famousFor": "Windows",
    "engineName": "ChatGPT / Copilot",
    "parameterSizes": {
      "small": "gpt-oss / Turbo; Nano; Mini; 1; 2",
      "medium": "",
      "large": "Instant; Luna / 3; 4o",
      "massive": "Terra",
      "colossal": "4; oX",
      "planetary": "Sol; Cyber",
      "singularity": "Astra; Bel",
      "godTier": ""
    },
    "subscriptionTiers": "Go, Plus, Pro, Business, Ent.",
    "harnessSdk": "Codex Harness / Copilot Workspace",
    "dailyAgent": "Dots, ChatGPT Work / Autopilot",
    "codingAgent": "Codex + Workspace / Copilot Code & Cowork"
  },
  {
    "id": "spacexai",
    "group": "top10",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "SpaceXAI / xAI",
    "famousFor": "Tesla, Twitter",
    "engineName": "Grok",
    "parameterSizes": {
      "small": "",
      "medium": "0",
      "large": "",
      "massive": "1; 2",
      "colossal": "3; 4",
      "planetary": "",
      "singularity": "",
      "godTier": ""
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
    "famousFor": "Chinas Amazon",
    "engineName": "Qwen / Qwen Coder",
    "parameterSizes": {
      "small": "27B / 2.5",
      "medium": "Next",
      "large": "Flash",
      "massive": "Plus / 3",
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
    "parameterSizes": {
      "small": "Lite; Distill",
      "medium": "",
      "large": "",
      "massive": "Flash",
      "colossal": "R1",
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
    "parameterSizes": {
      "small": "",
      "medium": "Linear",
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
    "creator": "Zhipu AI (Z.ai)",
    "famousFor": "",
    "engineName": "GLM 4 / GLM 5",
    "parameterSizes": {
      "small": "Flash",
      "medium": "Air",
      "large": "V",
      "massive": "GLM / Flash",
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
    "parameterSizes": {
      "small": "",
      "medium": "1",
      "large": "2",
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
    "famousFor": "GitHub Copilot",
    "parameterSizes": {
      "small": "Phi",
      "medium": "",
      "large": "Flash",
      "massive": "",
      "colossal": "Thinking",
      "planetary": ""
    },
    "specialties": "GitHub Copilot"
  },
  {
    "id": "contender-4",
    "group": "contender",
    "country": "America (US)",
    "countryFlag": "🇺🇸",
    "creator": "Reflection",
    "engineName": "Beam",
    "famousFor": "https://reflection.ai/blog/introducing-beam",
    "parameterSizes": {
      "small": "",
      "medium": "",
      "large": "",
      "massive": "Beam",
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
    "creator": "Ant Group/InclusionAI",
    "engineName": "Ling",
    "famousFor": "",
    "parameterSizes": {
      "small": "3 Tiny; 2 Mini; 1 Lite",
      "medium": "3 Flash",
      "large": "",
      "massive": "3.1 Flash; 2 Plus",
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
    "parameterSizes": {
      "small": "ERNIE",
      "medium": "1",
      "large": "2; 3",
      "massive": "4",
      "colossal": "5",
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
    "parameterSizes": {
      "small": "",
      "medium": "Flash-Lite",
      "large": "",
      "massive": "",
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
    "parameterSizes": {
      "small": "",
      "medium": "",
      "large": "2",
      "massive": "1; 3",
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
    "parameterSizes": {
      "small": "",
      "medium": "1",
      "large": "",
      "massive": "2",
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
    "parameterSizes": {
      "small": "VL",
      "medium": "1",
      "large": "3",
      "massive": "",
      "colossal": "2; 5",
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
    "parameterSizes": {
      "small": "",
      "medium": "1",
      "large": "2",
      "massive": "3",
      "colossal": "4",
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
    "parameterSizes": {
      "small": "",
      "medium": "",
      "large": "1",
      "massive": "",
      "colossal": "2",
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
    "parameterSizes": {
      "small": "2",
      "medium": "1",
      "large": "",
      "massive": "3",
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
    "parameterSizes": {
      "small": "Mini",
      "medium": "1; 3",
      "large": "2",
      "massive": "4",
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
    "parameterSizes": {
      "small": "Think; Horizon",
      "medium": "",
      "large": "",
      "massive": "",
      "colossal": "",
      "planetary": ""
    },
    "specialties": "*Institute of Foundation Models"
  }
];
