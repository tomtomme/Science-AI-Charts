import { LabEntry } from '../types';

export const RAW_LAB_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR8QbYqPYx_PnohNVTT-hAU-NkOt9hVh-INeH_SJPwoYJpoRsBUGdmanYRZiz3ll1J0scf5U_vju3nG/pub?gid=355721692&single=true&output=csv';

export const DIRECT_EXPORT_LAB_CSV_URL = 'https://docs.google.com/spreadsheets/d/1Meep9uT4Q2qRWaBM1Bwu4ZnYNB0J51ib-hP1OsOOCuI/export?format=csv&gid=355721692';

export const FALLBACK_LAB_ENTRIES: LabEntry[] = [
  {
    "id": "anthropic",
    "group": "top10",
    "country": "America (US)",
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Anthropic",
    "famousFor": "",
    "engineName": "Claude",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Google",
    "famousFor": "YouTube, Android",
    "engineName": "Gemini & NotebookLM",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Nvidia",
    "famousFor": "AI- & Graphics Chips",
    "engineName": "Nemotron",
    "parameterSizes": {
      "small": "Lightning",
      "medium": "Bolt; Super",
      "colossal": "Ultra"
    },
    "subscriptionTiers": "",
    "harnessSdk": "NemoClaw +NeMo Toolkit",
    "dailyAgent": "\u2013",
    "codingAgent": "Enterprise AI Fact."
  },
  {
    "id": "openai",
    "group": "top10",
    "country": "America (US)",
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "OpenAI / Microsoft",
    "famousFor": "Windows",
    "engineName": "ChatGPT / Copilot",
    "parameterSizes": {
      "small": "gpt-oss / Turbo; Nano; Mini; 1; 2",
      "large": "Instant; Luna / 3; 4o",
      "massive": "Terra",
      "colossal": "4; oX",
      "planetary": "Sol; Cyber",
      "singularity": "Astra; Bel"
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "SpaceXAI / xAI",
    "famousFor": "Tesla, Twitter",
    "engineName": "Grok",
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
    "countryFlag": "\ud83c\udde8\ud83c\uddf3",
    "creator": "Alibaba",
    "famousFor": "Chinas Amazon",
    "engineName": "Qwen / Qwen Coder",
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
    "countryFlag": "\ud83c\udde8\ud83c\uddf3",
    "creator": "DeepSeek",
    "famousFor": "",
    "engineName": "DeepSeek",
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
    "countryFlag": "\ud83c\udde8\ud83c\uddf3",
    "creator": "Moonshot",
    "famousFor": "",
    "engineName": "Kimi",
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
    "countryFlag": "\ud83c\udde8\ud83c\uddf3",
    "creator": "Zhipu AI (Z.ai)",
    "famousFor": "",
    "engineName": "GLM 4 / GLM 5",
    "parameterSizes": {
      "small": "Flash",
      "medium": "Air",
      "large": "V",
      "massive": "GLM / Flash",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Amazon",
    "engineName": "Nova",
    "famousFor": "Alexa, Kiro on AWS",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Inception",
    "engineName": "Mercury",
    "famousFor": "",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Microsoft",
    "engineName": "Phi & MAI",
    "famousFor": "GitHub Copilot",
    "parameterSizes": {
      "small": "Phi",
      "large": "Flash",
      "colossal": "Thinking"
    },
    "specialties": "GitHub Copilot"
  },
  {
    "id": "contender-4",
    "group": "contender",
    "country": "America (US)",
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Reflection",
    "engineName": "Beam",
    "famousFor": "https://reflection.ai/blog/introducing-beam",
    "parameterSizes": {
      "massive": "Beam"
    },
    "specialties": "https://reflection.ai/blog/introducing-beam"
  },
  {
    "id": "contender-5",
    "group": "contender",
    "country": "America (US)",
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Thinking Machines",
    "engineName": "Inkling",
    "famousFor": "",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "SSI.inc",
    "engineName": "SSI",
    "famousFor": "",
    "parameterSizes": {
      "small": "incoming 2026"
    },
    "specialties": ""
  },
  {
    "id": "contender-7",
    "group": "contender",
    "country": "Canada",
    "countryFlag": "\ud83c\udde8\ud83c\udde6",
    "creator": "Cohere",
    "engineName": "-",
    "famousFor": "merged with Aleph-Alpha",
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
    "countryFlag": "\ud83c\udde8\ud83c\uddf3",
    "creator": "Ant Group/InclusionAI",
    "engineName": "Ling",
    "famousFor": "",
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
    "countryFlag": "\ud83c\udde8\ud83c\uddf3",
    "creator": "Baidu",
    "engineName": "ERNIE",
    "famousFor": "Chinas Google",
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
    "countryFlag": "\ud83c\udde8\ud83c\uddf3",
    "creator": "Meituan",
    "engineName": "LongCat",
    "famousFor": "",
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
    "countryFlag": "\ud83c\udde8\ud83c\uddf3",
    "creator": "MiniMax",
    "engineName": "M",
    "famousFor": "",
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
    "countryFlag": "\ud83c\udde8\ud83c\uddf3",
    "creator": "Nex AGI",
    "engineName": "N",
    "famousFor": "",
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
    "countryFlag": "\ud83c\udde8\ud83c\uddf3",
    "creator": "Unisound",
    "engineName": "U",
    "famousFor": "",
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
    "countryFlag": "\ud83c\udde8\ud83c\uddf3",
    "creator": "Stepfun",
    "engineName": "Step",
    "famousFor": "",
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
    "countryFlag": "\ud83c\udde8\ud83c\uddf3",
    "creator": "Tencent",
    "engineName": "Hy / Hunyuan",
    "famousFor": "Chinas WhatsApp",
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
    "countryFlag": "\ud83c\udde8\ud83c\uddf3",
    "creator": "Xiaomi",
    "engineName": "MiMo",
    "famousFor": "",
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
    "countryFlag": "\ud83c\uddeb\ud83c\uddf7",
    "creator": "MIstral AI",
    "engineName": "Mistral",
    "famousFor": "DeepResearch",
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
    "countryFlag": "\ud83c\uddee\ud83c\uddf1",
    "creator": "AI21 Labs",
    "engineName": "Jamba",
    "famousFor": "",
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
    "countryFlag": "\ud83c\uddf8\ud83c\uddec",
    "creator": "Sapiens AI",
    "engineName": "Agnes",
    "famousFor": "Wide Research",
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
    "countryFlag": "\ud83c\uddf0\ud83c\uddf7",
    "creator": "LG AI Research",
    "engineName": "K-EXAONE",
    "famousFor": "",
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
    "countryFlag": "\ud83c\uddf0\ud83c\uddf7",
    "creator": "Motif Technologies",
    "engineName": "Motif",
    "famousFor": "",
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
    "countryFlag": "\ud83c\uddf0\ud83c\uddf7",
    "creator": "SK Telecom",
    "engineName": "A.X",
    "famousFor": "",
    "parameterSizes": {
      "colossal": "K2"
    },
    "specialties": ""
  },
  {
    "id": "contender-23",
    "group": "contender",
    "country": "South Korea",
    "countryFlag": "\ud83c\uddf0\ud83c\uddf7",
    "creator": "Upstage",
    "engineName": "Solar",
    "famousFor": "Reasoning",
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
    "countryFlag": "\ud83c\udde6\ud83c\uddea",
    "creator": "MBZUAI*",
    "engineName": "K2",
    "famousFor": "*Institute of Foundation Models",
    "parameterSizes": {
      "small": "Think; Horizon"
    },
    "specialties": "*Institute of Foundation Models"
  },
  {
    "id": "tweaker-1",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Apodex (Alibaba)",
    "engineName": "Apodex",
    "basedOn": "Qwen",
    "famousFor": "Based on Qwen",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Apple (Google)",
    "engineName": "Siri AI",
    "basedOn": "Gemini",
    "famousFor": "Based on Gemini",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Circuit & Chisel / Unbiased.ai",
    "engineName": "Pareto",
    "basedOn": "various",
    "famousFor": "Based on various",
    "parameterSizes": {
      "small": "orchestrates a mix of openweight models"
    },
    "specialties": "Based on various"
  },
  {
    "id": "tweaker-4",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "DeepReinforce (Alibaba, Google)",
    "engineName": "Ornith",
    "basedOn": "Qwen / Gemma",
    "famousFor": "Based on Qwen / Gemma",
    "parameterSizes": {
      "small": "1"
    },
    "specialties": "Based on Qwen / Gemma"
  },
  {
    "id": "tweaker-5",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Perplexity (Meta, Mistral)",
    "engineName": "Sonar",
    "basedOn": "Llama, Mistral",
    "famousFor": "Based on Llama, Mistral",
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
    "countryFlag": "\ud83c\uddef\ud83c\uddf5",
    "creator": "Sakana AI (Moonshot, Alibaba)",
    "engineName": "Sakana",
    "basedOn": "Kimi, Qwen",
    "famousFor": "Based on Kimi, Qwen",
    "parameterSizes": {
      "colossal": "Namazu; Fugu"
    },
    "specialties": "Based on Kimi, Qwen"
  },
  {
    "id": "tweaker-7",
    "group": "tweakers",
    "country": "Saudi Arabia",
    "countryFlag": "\ud83c\uddf8\ud83c\udde6",
    "creator": "HUMAIN (MiniMax)",
    "engineName": "M",
    "basedOn": "MiniMax",
    "famousFor": "Based on MiniMax",
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
    "countryFlag": "\ud83c\uddea\ud83c\uddf8",
    "creator": "Multiverse Computing (Z.ai)",
    "engineName": "-",
    "basedOn": "GLM",
    "famousFor": "Based on GLM",
    "parameterSizes": {
      "medium": "HyperNova",
      "massive": "Quasar"
    },
    "specialties": "Based on GLM"
  },
  {
    "id": "tweaker-more-1",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Abacus AI",
    "engineName": "Abacus AI",
    "basedOn": "Alibaba (Qwen)",
    "famousFor": "The Smaug series re-spins Qwen.",
    "parameterSizes": {},
    "specialties": "The Smaug series re-spins Qwen."
  },
  {
    "id": "tweaker-more-2",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Arcee AI",
    "engineName": "Arcee AI",
    "basedOn": "Meta / Mistral / Alibaba",
    "famousFor": "Evolutionary model merging for domain-adapted Llama, Mistral, and Qwen re-spins (SuperNova, Virtuoso).",
    "parameterSizes": {},
    "specialties": "Evolutionary model merging for domain-adapted Llama, Mistral, and Qwen re-spins (SuperNova, Virtuoso)."
  },
  {
    "id": "tweaker-more-3",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Cognitive Computations",
    "engineName": "Cognitive Computations",
    "basedOn": "Meta / Mistral / Alibaba",
    "famousFor": "Dolphin family for uncensored post-trained re-spins of Llama, Mistral, and Qwen.",
    "parameterSizes": {},
    "specialties": "Dolphin family for uncensored post-trained re-spins of Llama, Mistral, and Qwen."
  },
  {
    "id": "tweaker-more-4",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Nous Research",
    "engineName": "Nous Research",
    "basedOn": "Meta / Alibaba",
    "famousFor": "Hermes Agent family of fine-tuned Llama and Qwen re-spins.",
    "parameterSizes": {},
    "specialties": "Hermes Agent family of fine-tuned Llama and Qwen re-spins."
  },
  {
    "id": "tweaker-more-5",
    "group": "tweakers",
    "country": "America (US)",
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Fireworks AI",
    "engineName": "Fireworks AI",
    "basedOn": "Moonshot (Kimi)",
    "famousFor": "Kimi K3 efficiency re-spin named Ember.",
    "parameterSizes": {},
    "specialties": "Kimi K3 efficiency re-spin named Ember."
  },
  {
    "id": "small-1",
    "group": "small",
    "country": "America (US)",
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Hugging Face",
    "engineName": "SmolLM",
    "famousFor": "",
    "parameterSizes": {
      "micro": "SmolLM"
    },
    "specialties": ""
  },
  {
    "id": "small-2",
    "group": "small",
    "country": "America (US)",
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "IBM",
    "engineName": "Granite",
    "famousFor": "Watson, SPSS",
    "parameterSizes": {
      "micro": "Granite"
    },
    "specialties": "Watson, SPSS"
  },
  {
    "id": "small-3",
    "group": "small",
    "country": "America (US)",
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Liquid AI",
    "engineName": "LFM",
    "famousFor": "",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Magic.dev",
    "engineName": "LTM",
    "famousFor": "Scam?",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Morph Labs",
    "engineName": "diverse",
    "famousFor": "",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Poolside",
    "engineName": "Laguna",
    "famousFor": "",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "PrismML",
    "engineName": "Bonsai",
    "famousFor": "",
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
    "countryFlag": "\ud83c\udde8\ud83c\uddf3",
    "creator": "01.AI",
    "engineName": "Yi",
    "famousFor": "",
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
    "countryFlag": "\ud83c\udde8\ud83c\uddf3",
    "creator": "ByteDance",
    "engineName": "Dola-Seed",
    "famousFor": "TikTok",
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
    "countryFlag": "\ud83c\udde8\ud83c\uddf3",
    "creator": "iFlytek",
    "engineName": "Spark",
    "famousFor": "",
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
    "countryFlag": "\ud83c\udde8\ud83c\uddf3",
    "creator": "OpenBMB",
    "engineName": "MiniCPM",
    "famousFor": "",
    "parameterSizes": {
      "mini": "1 to 4"
    },
    "specialties": ""
  },
  {
    "id": "small-12",
    "group": "small",
    "country": "China",
    "countryFlag": "\ud83c\udde8\ud83c\uddf3",
    "creator": "Shanghai AI Lab",
    "engineName": "Intern",
    "famousFor": "big GLM 5.x re-spin",
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
    "countryFlag": "\ud83c\uddee\ud83c\uddf3",
    "creator": "Sarvam AI",
    "engineName": "Sarvam",
    "famousFor": "",
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
    "countryFlag": "\ud83c\uddf0\ud83c\uddf7",
    "creator": "Samsung",
    "engineName": "Gauss 1",
    "famousFor": "for Galaxy AI",
    "parameterSizes": {
      "mini": "Image",
      "tiny": "Language",
      "medium": "Cloud Server",
      "large": "Code"
    },
    "specialties": "for Galaxy AI"
  },
  {
    "id": "harness-1",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "LangChain",
    "famousFor": "",
    "engineName": "Deep Agents+LangGraph",
    "harness": "Deep Agents+LangGraph",
    "form": "SDK",
    "note": "",
    "parameterSizes": {},
    "specialties": "SDK"
  },
  {
    "id": "harness-9",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "OpenClaw Foundation",
    "famousFor": "Austrian origin",
    "engineName": "OpenClaw/Code",
    "harness": "OpenClaw/Code",
    "form": "CLI \u00fcber Messenger",
    "note": "Austrian origin",
    "parameterSizes": {},
    "specialties": "CLI \u00fcber Messenger (Austrian origin)"
  },
  {
    "id": "harness-11",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
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
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
    "creator": "Warp",
    "famousFor": "",
    "engineName": "Warp+Factories",
    "harness": "Warp+Factories",
    "form": "CLI/IDE-Hybrid",
    "note": "",
    "parameterSizes": {},
    "specialties": "CLI/IDE-Hybrid"
  },
  {
    "id": "harness-15",
    "group": "harness",
    "country": "America (US)",
    "countryFlag": "\ud83c\uddfa\ud83c\uddf8",
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
    "countryFlag": "\ud83c\uddee\ud83c\uddf1",
    "creator": "Qodo",
    "famousFor": "formerly CodiumAI",
    "engineName": "Gen/Review",
    "harness": "Gen/Review",
    "form": "IDE + CLI + Git",
    "note": "formerly CodiumAI",
    "parameterSizes": {},
    "specialties": "IDE + CLI + Git (formerly CodiumAI)"
  },
  {
    "id": "harness-17",
    "group": "harness",
    "country": "Singapur",
    "countryFlag": "\ud83c\uddf8\ud83c\uddec",
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
