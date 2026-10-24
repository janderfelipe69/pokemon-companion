import { spriteUrl } from "@/config/images";

/**
 * Medalhas (emblemas) do jogo: uma por Pokémon da Gen 1 (#1 a #151).
 * Cada medalha dá +1 de um buff e, na maioria, −1 de um debuff.
 * Para corrigir uma medalha, edite só a linha dela em RAW.
 */

export type MedalCategory = "combate" | "leech" | "defesa" | "loot" | "shiny" | "velocidade";

export const MEDAL_CATEGORIES: { key: MedalCategory; label: string }[] = [
  { key: "combate", label: "Combate" },
  { key: "leech", label: "Life Leech" },
  { key: "defesa", label: "Defesa" },
  { key: "loot", label: "Loot / Catch" },
  { key: "shiny", label: "Shiny" },
  { key: "velocidade", label: "Velocidade / Outros" },
];

/** Todos os buffs/debuffs que existem nas medalhas. `label` é o nome mostrado no site. */
export const MEDAL_STATS = {
  damage: { label: "Damage Boost", category: "combate" },
  critChance: { label: "Critical Chance", category: "combate" },
  critDamage: { label: "Critical Damage", category: "combate" },
  precision: { label: "Precision Percent", category: "combate" },
  lifeLeech: { label: "Life Leech", category: "leech" },
  defense: { label: "Defense Boost", category: "defesa" },
  hp: { label: "HP Boost", category: "defesa" },
  critResist: { label: "Critical Resistance", category: "defesa" },
  evasion: { label: "Evasion Percent", category: "defesa" },
  loot: { label: "Loot Boost", category: "loot" },
  catchRate: { label: "Catch Rate", category: "loot" },
  shinyFishing: { label: "Shiny Fishing Rate", category: "shiny" },
  shinyHeadbutt: { label: "Shiny Headbutt Rate", category: "shiny" },
  shinyCatch: { label: "Shiny Catch Rate", category: "shiny" },
  shinyCharm: { label: "Shiny Charm Rate", category: "shiny" },
  pokemonSpeed: { label: "Pokemon Speed", category: "velocidade" },
  characterSpeed: { label: "Character Speed", category: "velocidade" },
  rideSpeed: { label: "Ride Speed", category: "velocidade" },
  surfSpeed: { label: "Surf Speed", category: "velocidade" },
  flySpeed: { label: "Fly Speed", category: "velocidade" },
  fishingSkill: { label: "Fishing Skill", category: "velocidade" },
  extraFishing: { label: "Extra Fishing", category: "velocidade" },
  headbuttSkill: { label: "Headbutt Skill", category: "velocidade" },
} as const satisfies Record<string, { label: string; category: MedalCategory }>;

export type MedalStatKey = keyof typeof MEDAL_STATS;

export type Medal = {
  /** Número na Pokédex nacional (também é o número da medalha). */
  id: number;
  name: string;
  /** Buff (+1). */
  plus: MedalStatKey;
  /** Debuff (−1). `null` = medalha sem debuff. */
  minus: MedalStatKey | null;
};

/** Formato: id | nome | buff | debuff ("-" = sem debuff) */
const RAW = `
1|Bulbasaur|defense|damage
2|Ivysaur|hp|pokemonSpeed
3|Venusaur|pokemonSpeed|hp
4|Charmander|characterSpeed|pokemonSpeed
5|Charmeleon|critChance|characterSpeed
6|Charizard|critDamage|defense
7|Squirtle|lifeLeech|critDamage
8|Wartortle|precision|lifeLeech
9|Blastoise|evasion|fishingSkill
10|Caterpie|shinyFishing|evasion
11|Metapod|shinyHeadbutt|shinyFishing
12|Butterfree|loot|shinyHeadbutt
13|Weedle|catchRate|loot
14|Kakuna|shinyCatch|catchRate
15|Beedrill|shinyCharm|headbuttSkill
16|Pidgey|critResist|shinyCharm
17|Pidgeotto|flySpeed|extraFishing
18|Pidgeot|flySpeed|surfSpeed
19|Rattata|rideSpeed|surfSpeed
20|Raticate|damage|rideSpeed
21|Spearow|defense|damage
22|Fearow|hp|defense
23|Ekans|pokemonSpeed|hp
24|Arbok|characterSpeed|pokemonSpeed
25|Pikachu|critChance|characterSpeed
26|Raichu|critDamage|critChance
27|Sandshrew|lifeLeech|critDamage
28|Sandslash|precision|lifeLeech
29|Nidoran F|evasion|fishingSkill
30|Nidorina|shinyFishing|evasion
31|Nidoqueen|shinyHeadbutt|shinyFishing
32|Nidoran M|loot|shinyHeadbutt
33|Nidorino|catchRate|loot
34|Nidoking|shinyCatch|catchRate
35|Clefairy|shinyCharm|shinyCatch
36|Clefable|critResist|shinyCharm
37|Vulpix|flySpeed|extraFishing
38|Ninetales|surfSpeed|flySpeed
39|Jigglypuff|rideSpeed|surfSpeed
40|Wigglytuff|damage|rideSpeed
41|Zubat|defense|lifeLeech
42|Golbat|hp|defense
43|Oddish|pokemonSpeed|hp
44|Gloom|characterSpeed|pokemonSpeed
45|Vileplume|critChance|characterSpeed
46|Paras|critDamage|critChance
47|Parasect|lifeLeech|critDamage
48|Venonat|precision|lifeLeech
49|Venomoth|evasion|fishingSkill
50|Diglett|shinyFishing|evasion
51|Dugtrio|shinyHeadbutt|shinyFishing
52|Meowth|loot|shinyHeadbutt
53|Persian|catchRate|loot
54|Psyduck|shinyCatch|catchRate
55|Golduck|shinyCharm|shinyCatch
56|Mankey|critResist|shinyCharm
57|Primeape|flySpeed|extraFishing
58|Growlithe|surfSpeed|flySpeed
59|Arcanine|rideSpeed|surfSpeed
60|Poliwag|damage|rideSpeed
61|Poliwhirl|defense|surfSpeed
62|Poliwrath|hp|defense
63|Abra|pokemonSpeed|hp
64|Kadabra|characterSpeed|pokemonSpeed
65|Alakazam|critChance|characterSpeed
66|Machop|critDamage|critChance
67|Machoke|lifeLeech|critDamage
68|Machamp|precision|lifeLeech
69|Bellsprout|evasion|fishingSkill
70|Weepinbell|shinyFishing|evasion
71|Victreebel|shinyHeadbutt|shinyFishing
72|Tentacool|loot|shinyHeadbutt
73|Tentacruel|catchRate|loot
74|Geodude|shinyCatch|catchRate
75|Graveler|shinyCharm|shinyCatch
76|Golem|critResist|shinyCharm
77|Ponyta|flySpeed|extraFishing
78|Rapidash|surfSpeed|flySpeed
79|Slowpoke|rideSpeed|surfSpeed
80|Slowbro|damage|rideSpeed
81|Magnemite|defense|damage
82|Magneton|hp|defense
83|Farfetch'd|pokemonSpeed|hp
84|Doduo|characterSpeed|pokemonSpeed
85|Dodrio|critChance|characterSpeed
86|Seel|critDamage|critChance
87|Dewgong|lifeLeech|critDamage
88|Grimer|precision|lifeLeech
89|Muk|evasion|fishingSkill
90|Shellder|shinyFishing|evasion
91|Cloyster|shinyHeadbutt|shinyFishing
92|Gastly|loot|shinyHeadbutt
93|Haunter|catchRate|loot
94|Gengar|shinyCatch|catchRate
95|Onix|shinyCharm|shinyCatch
96|Drowzee|critResist|shinyCharm
97|Hypno|flySpeed|extraFishing
98|Krabby|surfSpeed|flySpeed
99|Kingler|rideSpeed|surfSpeed
100|Voltorb|damage|rideSpeed
101|Electrode|defense|damage
102|Exeggcute|hp|defense
103|Exeggutor|pokemonSpeed|hp
104|Cubone|characterSpeed|pokemonSpeed
105|Marowak|critChance|characterSpeed
106|Hitmonlee|critDamage|critChance
107|Hitmonchan|lifeLeech|critDamage
108|Lickitung|precision|damage
109|Koffing|evasion|fishingSkill
110|Weezing|shinyFishing|evasion
111|Rhyhorn|shinyHeadbutt|shinyFishing
112|Rhydon|loot|shinyHeadbutt
113|Chansey|catchRate|loot
114|Tangela|shinyCatch|catchRate
115|Kangaskhan|shinyCharm|shinyCatch
116|Horsea|critResist|shinyFishing
117|Seadra|flySpeed|extraFishing
118|Goldeen|surfSpeed|flySpeed
119|Seaking|rideSpeed|surfSpeed
120|Staryu|damage|rideSpeed
121|Starmie|defense|surfSpeed
122|Mr. Mime|hp|defense
123|Scyther|pokemonSpeed|hp
124|Jynx|characterSpeed|pokemonSpeed
125|Electabuzz|critChance|characterSpeed
126|Magmar|critDamage|critChance
127|Pinsir|lifeLeech|critDamage
128|Tauros|precision|lifeLeech
129|Magikarp|evasion|fishingSkill
130|Gyarados|shinyFishing|headbuttSkill
131|Lapras|shinyHeadbutt|shinyFishing
132|Ditto|loot|shinyHeadbutt
133|Eevee|catchRate|loot
134|Vaporeon|shinyCatch|catchRate
135|Jolteon|shinyCharm|shinyCatch
136|Flareon|critResist|shinyCharm
137|Porygon|flySpeed|extraFishing
138|Omanyte|surfSpeed|flySpeed
139|Omastar|rideSpeed|surfSpeed
140|Kabuto|damage|rideSpeed
141|Kabutops|defense|damage
142|Aerodactyl|hp|defense
143|Snorlax|pokemonSpeed|hp
144|Articuno|pokemonSpeed|-
145|Zapdos|characterSpeed|-
146|Moltres|critChance|-
147|Dratini|lifeLeech|critDamage
148|Dragonair|precision|lifeLeech
149|Dragonite|evasion|fishingSkill
150|Mewtwo|shinyCatch|-
151|Mew|shinyCharm|-
`;

function parse(): Medal[] {
  const toKey = (raw: string, line: string): MedalStatKey => {
    if (!(raw in MEDAL_STATS)) throw new Error(`Medalha inválida (buff desconhecido "${raw}"): ${line}`);
    return raw as MedalStatKey;
  };
  return RAW.trim()
    .split("\n")
    .map((line) => {
      const [id, name, plus, minus] = line.split("|");
      return {
        id: Number(id),
        name,
        plus: toKey(plus, line),
        minus: minus === "-" ? null : toKey(minus, line),
      };
    });
}

export const MEDALS: Medal[] = parse();
export const MEDAL_BY_ID = new Map(MEDALS.map((m) => [m.id, m]));
export const MAX_EQUIPPED = 10;

export const medalSpriteUrl = (id: number) => spriteUrl(`${id}.png`);
export const statLabel = (key: MedalStatKey) => MEDAL_STATS[key].label;
export const statCategory = (key: MedalStatKey) => MEDAL_STATS[key].category;
