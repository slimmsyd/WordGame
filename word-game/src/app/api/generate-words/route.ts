import { NextResponse } from 'next/server';

// Large curated word pool organized by theme (200+ words)
const WORD_POOL = {
  // Hoodoo / Voodoo / Rootwork
  hoodoo: [
    "ROOTWORK", "CONJURE", "MOJO", "GRISGRIS", "LOA", "SPIRITS", "ALTAR",
    "CANDLE", "JINX", "HEX", "BLESS", "ANCESTORS", "ORISHA", "CHARM",
    "TALISMAN", "LODESTONE", "DRAGON", "LUCK", "JUSTICE", "RITUAL",
    "VOODOO", "HOODOO", "SPELL", "POTION", "BREW", "ROOT", "HERB",
    "BONE", "DUST", "OIL", "POWDER", "DOLL", "PINS", "GRAVEYARD",
    "CROSSROAD", "MIDNIGHT", "MOON", "CLEANSE", "PROTECT", "BANISH",
    "BIND", "ATTRACT", "MONEY", "LOVE", "REVENGE", "HEALING", "CURSE",
    "UNCROSS", "HOTFOOT", "SWEETJAR"
  ],

  // Gnostic / Spirituality / Mysticism
  gnostic: [
    "GNOSIS", "ARCHON", "SOPHIA", "PLEROMA", "AEON", "LOGOS", "DIVINE",
    "AWAKEN", "CHAKRA", "AURA", "COSMIC", "SACRED", "WISDOM", "GRACE",
    "MIRACLE", "ETHEREAL", "SOUL", "LIGHT", "TRUTH", "MYSTIC",
    "SPIRIT", "ENERGY", "VIBRATE", "MANIFEST", "UNIVERSE", "HIGHER",
    "PINEAL", "MERKABA", "ASTRAL", "REALM", "VEIL",
    "ILLUMINATE", "TRANSCEND", "BAPTISM", "CHRIST", "RISEN", "ANGEL",
    "SERAPH", "HEAVEN", "PRAYER", "MEDITATE", "TEMPLE", "HOLY",
    "BLESSED", "ANOINT", "PROPHET", "VISION", "DREAM", "SEER"
  ],

  // Mindset / Success / Think and Grow Rich
  mindset: [
    "DESIRE", "FAITH", "VISION", "WEALTH", "POWER", "GROWTH", "MASTER",
    "ACHIEVE", "PURPOSE", "PASSION", "FOCUS", "RESULTS", "WIN",
    "DREAM", "BELIEVE", "CREATE", "LEADER", "SUCCESS", "MONEY",
    "RICH", "PROSPER", "ABUNDANT", "HUSTLE", "GRIND", "BOSS",
    "EMPIRE", "LEGACY", "MINDSET", "ATTRACT", "MANIFEST", "AFFIRM",
    "GRATEFUL", "POSITIVE", "INFLUENCE", "NETWORK", "LEVERAGE",
    "COMPOUND", "INVEST", "ASSETS", "INCOME", "FREEDOM", "RETIRE",
    "MENTAL", "STRONG", "PERSIST", "OVERCOME", "CONQUER", "DOMINATE",
    "EXCELLENCE", "GIANT"
  ],

  // 12 Week Year / Execution / Productivity
  execution: [
    "EXECUTE", "PLAN", "GOAL", "ACTION", "SCORE", "TRACK", "SPRINT",
    "HABIT", "PROGRESS", "MOMENTUM", "TACTICS", "STRATEGY", "WEEKLY",
    "URGENCY", "DEADLINE", "COMMIT", "OWNERSHIP", "PRIORITY",
    "MEASURE", "REVIEW", "ADJUST", "ITERATE", "IMPROVE", "OPTIMIZE",
    "SYSTEM", "PROCESS", "ROUTINE", "MORNING", "RITUAL", "BLOCK",
    "BATCH", "FLOW", "ZONE", "PEAK", "LASER", "INTENSE",
    "DISCIPLINE", "CONTROL", "ACCOUNTABLE", "RESULTS", "OUTPUT",
    "DELIVER", "SHIP", "LAUNCH", "FINISH", "COMPLETE", "DONE",
    "CLOCK", "TIMER"
  ],

  // Cannabis / Herb Culture / Rasta Vibes
  herblife: [
    "RASTA", "GANJA", "HERB", "BLAZE", "CHRONIC", "KUSH", "LOUD",
    "PUFF", "CHEEF", "TOKE", "DANK", "STICKY", "ICKY", "FIRE",
    "GAS", "ZAZA", "EXOTIC", "PREMIUM", "PURPLE", "HAZE", "OG",
    "SATIVA", "INDICA", "HYBRID", "TERPS", "THC", "CBD",
    "MUNCHIES", "CHILL", "VIBE", "RELAX", "MELLOW", "LIFTED",
    "ELEVATED", "BLESSED", "IRIE", "JAH", "ZION", "BABYLON",
    "MARLEY", "PEACE", "LOVE", "UNITY", "NATURAL", "ORGANIC",
    "MEDICATE", "REMEDY", "HEALING", "CLARITY"
  ],

  // Neuroscience / Brain Chemistry / Psychology
  neuro: [
    "DOPAMINE", "NEURON", "SYNAPSE", "BRAIN", "CORTEX", "RECEPTOR",
    "SEROTONIN", "ENDORPHIN", "OXYTOCIN", "GABA", "GLUTAMATE",
    "NEURAL", "COGNITION", "MEMORY", "LEARNING", "PLASTICITY",
    "PATHWAY", "SIGNAL", "TRANSMIT", "AXON", "DENDRITE", "IMPULSE",
    "CHEMICAL", "HORMONE", "AMYGDALA", "PREFRONTAL", "LIMBIC",
    "REWARD", "PLEASURE", "BLISS", "EUPHORIA", "CALM", "FOCUS",
    "ALERT", "CREATIVE", "INSIGHT", "GENIUS",
    "MINDFUL", "PRESENT", "CONSCIOUS", "HYPNOSIS",
    "TRANCE", "THETA", "ALPHA", "BETA", "GAMMA", "DELTA"
  ],

  // Welcome to Derry / IT / Stephen King Horror
  derry: [
    "DERRY", "PENNYWISE", "CLOWN", "FLOAT", "BALLOON", "SEWER",
    "LOSERS", "CLUB", "FEAR", "TERROR", "HORROR", "HAUNTED",
    "DEMON", "EVIL", "MONSTER", "CREATURE", "LURK", "HUNT",
    "DEADLIGHT", "MACROVERSE", "TURTLE", "MATURIN", "ANCIENT",
    "BARRENS", "NEIBOLT", "CIRCUS", "CARNIVAL", "FREAKSHOW",
    "SCREAM", "NIGHTMARE", "DARK", "SHADOW", "CREEP", "DREAD",
    "MISSING", "CHILDREN", "VICTIM", "PREY", "STALK", "TRAP",
    "ILLUSION", "SHAPE", "SHIFTER", "EATER", "HUNGRY", "AWAKEN",
    "RITUAL", "SACRIFICE", "BLOOD", "CRIMSON", "RAIN", "STORM",
    "MAINE", "KING", "CHAPTER", "CYCLE", "RETURN", "REVENGE"
  ]
};

// Flatten all words for mixed selection
const ALL_WORDS = Object.values(WORD_POOL).flat();

// Theme names for random selection
const THEMES = Object.keys(WORD_POOL) as (keyof typeof WORD_POOL)[];

export async function GET() {
  try {
    // Randomly decide: themed or mixed selection
    const useMixed = Math.random() < 0.3; // 30% chance for mixed themes
    
    let selectedWords: string[];
    
    if (useMixed) {
      // Pick from all themes randomly
      const shuffled = [...ALL_WORDS].sort(() => Math.random() - 0.5);
      selectedWords = shuffled.slice(0, 10);
    } else {
      // Pick a random theme and select mostly from it
      const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
      const themeWords = [...WORD_POOL[theme]].sort(() => Math.random() - 0.5);
      
      // Take 6-8 from theme
      const themeCount = 6 + Math.floor(Math.random() * 3);
      const fromTheme = themeWords.slice(0, themeCount);
      
      // Fill remaining from other themes
      const otherWords = ALL_WORDS.filter(w => !WORD_POOL[theme].includes(w));
      const shuffledOther = otherWords.sort(() => Math.random() - 0.5);
      const fromOther = shuffledOther.slice(0, 10 - themeCount);
      
      selectedWords = [...fromTheme, ...fromOther].sort(() => Math.random() - 0.5);
    }
    
    // Clean and validate
    const cleanWords = selectedWords
      .map(w => w.toUpperCase().replace(/[^A-Z]/g, ''))
      .filter(w => w.length >= 3 && w.length <= 10);
    
    // Deduplicate
    const uniqueWords = [...new Set(cleanWords)].slice(0, 10);
    
    // Ensure minimum words
    if (uniqueWords.length < 5) {
      return NextResponse.json({ 
        words: ["FAITH", "SPIRIT", "VISION", "POWER", "MANIFEST", "RITUAL"] 
      });
    }
    
    return NextResponse.json({ words: uniqueWords });
    
  } catch (error) {
    console.error("Word Gen Error:", error);
    return NextResponse.json({ 
      words: ["MOJO", "FAITH", "VISION", "SPIRIT", "CONJURE", "GNOSIS"] 
    }, { status: 200 });
  }
}
