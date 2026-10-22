/**
 * Lista original de Pokémon, copiada da fonte sem alterações de conteúdo.
 * Colunas: Nome | Tier | Tipo (separadas por "|" ou tabulação).
 * "?" ou campo vazio = não definido. Para atualizar a lista, edite este texto.
 */
export const rawPokemonList = `
Bulbasaur|T6|Grass
Shiny Bulbasaur|T5|Grass
Ivysaur|T5|Grass
Shiny Ivysaur|T4|Grass
Venusaur|T3|Grass
Shiny Venusaur|T1|Grass
Charmander|T6|Fire
Shiny Charmander|T5|Fire
Charmeleon|T5|Fire
Shiny Charmeleon|T4|Fire
Charizard|T3|Fire
Shiny Charizard|T1|Fire
Squirtle|T6|Water
Shiny Squirtle|T5|Water
Wartortle|T5|Water
Shiny Wartortle|T4|Water
Blastoise|T3|Water
Shiny Blastoise|T1|Water
Caterpie|T7|Bug
Shiny Caterpie|T6|Bug
Metapod|T6|Bug
Shiny Metapod|T5|Bug
Butterfree|T5|Flying
Shiny Butterfree|T4|Flying
Weedle|T7|Bug
Shiny Weedle|T6|Bug
Kakuna|T6|Bug
Shiny Kakuna|T5|Bug
Beedrill|T5|Bug
Shiny Beedrill|T4|Bug
Pidgey|T7|Flying
Shiny Pidgey|T6|Flying
Pidgeotto|T5|Flying
Shiny Pidgeotto|T4|Flying
Pidgeot|T3|Flying
Shiny Pidgeot|T1|Flying
Rattata|T7|Normal
Shiny Rattata|T6|Normal
Raticate|T5|Normal
Shiny Raticate|T4|Normal
Spearow|T7|Flying
Shiny Spearow|T6|Flying
Fearow|T5|Flying
Shiny Fearow|T3|Flying
Ekans|T6|Poison
Shiny Ekans|T5|Poison
Arbok|T4|Poison
Shiny Arbok|T3|Poison
Pikachu|T5|Electric
Shiny Pikachu|T4|Electric
Raichu|T3|Electric
Shiny Raichu|T1|Electric
Sandshrew|T6|Ground
Shiny Sandshrew|T5|Ground
Sandslash|T4|Ground
Shiny Sandslash|T3|Ground
Nidoran female|T6|Poison
Shiny Nidoran female|T5|Poison
Nidorina|T5|Ground
Shiny Nidorina|T4|Ground
Nidoqueen|T3|Ground
Shiny Nidoqueen|T1|Ground
Nidoran Male|T6|Poison
Shiny Nidoran Male|T5|Poison
Nidorino|T5|Poison
Shiny Nidorino|T4|Poison
Nidoking|T3|Poison
Shiny Nidoking|T1|Poison
Clefairy|T6|Fairy
Shiny Clefairy|T5|Fairy
Clefable|T4|Fairy
Shiny Clefable|T3|Fairy
Mega Clefable|T1|Fairy
Vulpix|T6|Fire
Shiny Vulpix|T5|Fire
Ninetales|T3|Fire
Shiny Ninetales|T1|Fire
Jigglypuff|T6|Fairy
Shiny Jigglypuff|T5|Fairy
Wigglytuff|T4|Fairy
Shiny Wigglytuff|T2|Fairy
Zubat|T7|Poison
Shiny Zubat|T5|Flying
Golbat|T5|Poison
Shiny Golbat|T4|Flying
Oddish|T7|Grass
Shiny Oddish|T6|Poison
Gloom|T5|Poison
Shiny Gloom|T4|Poison
Vileplume|T4|Grass
Shiny Vileplume|T3|Grass
Paras|T7|Bug
Shiny Paras|T5|Bug
Parasect|T5|Bug
Shiny Parasect|T4|Bug
Venonat|T6|Poison
Shiny Venonat|T5|Bug
Venomoth|T4|Bug
Shiny Venomoth|T2|Bug
Diglett|T6|Ground
Shiny Diglett|T5|Ground
Dugtrio|T4|Ground
Shiny Dugtrio|T3|Ground
Meowth|T6|Dark
Shiny Meowth|T5|Dark
Persian|T4|Dark
Shiny Persian|T2|Dark
Psyduck|T6|Psychic
Shiny Psyduck|T5|Psychic
Golduck|T4|Water
Shiny Golduck|T3|Water
Mankey|T6|Fighting
Shiny Mankey|T5|Fighting
Primeape|T4|Fighting
Shiny Primeape|T3|Fighting
Growlithe|T6|Fire
Shiny Growlithe|T5|Fire
Arcanine|T2|Fire
Shiny Arcanine|Super Rare|Fire
Poliwag|T6|Water
Shiny Poliwag|T5|Water
Poliwhirl|T5|Water
Shiny Poliwhirl|T4|Water
Poliwrath|T3|Fighting
Shiny Poliwrath|T1|Fighting
Abra|T6|Psychic
Shiny Abra|T5|Psychic
Kadabra|T5|Psychic
Shiny Kadabra|T4|Psychic
Alakazam|T2|Psychic
Shiny Alakazam|Legendary|Psychic
Machop|T6|Fighting
Shiny Machop|T5|Fighting
Machoke|T5|Fighting
Shiny Machoke|T4|Fighting
Machamp|T2|Fighting
Shiny Machamp|Super Rare|Fighting
Bellsprout|T7|Grass
Shiny Bellsprout|T5|Grass
Weepinbell|T5|Grass
Shiny Weepinbell|T4|Grass
Victreebel|T4|Grass
Shiny Victreebel|T2|Grass
Tentacool|T6|Water
Shiny Tentacool|T5|Water
Tentacruel|T3|Poison
Shiny Tentacruel|T1|Poison
Geodude|T6|Rock
Shiny Geodude|T5|Rock
Graveler|T5|Rock
Shiny Graveler|T4|Rock
Golem|T3|Rock
Shiny Golem|T1|Rock
Ponyta|T6|Fire
Shiny Ponyta|T5|Fire
Rapidash|T3|Fire
Shiny Rapidash|T1|Fire
Slowpoke|T6|Water
Shiny Slowpoke|T5|Water
Slowbro|T5|Psychic
Shiny Slowbro|T4|Psychic
Magnemite|T6|Electric
Shiny Magnemite|T5|Steel
Magneton|T3|Steel
Shiny Magneton|T2|Steel
Farfetch'd|T5|Flying
Shiny Farfetch'd|T1|Flying
Doduo|T6|Flying
Shiny Doduo|T5|Flying
Dodrio|T4|Flying
Shiny Dodrio|T1|Flying
Seel|T6|Ice
Shiny Seel|T5|Ice
Dewgong|T4|Ice
Shiny Dewgong|T3|Ice
Grimer|T6|Poison
Shiny Grimer|T5|Poison
Muk|T3|Poison
Shiny Muk|T1|Poison
Shellder|T6|Ice
Shiny Shellder|T5|Ice
Cloyster|T4|Ice
Shiny Cloyster|T3|Ice
Gastly|T6|Ghost
Shiny Gastly|T5|Ghost
Haunter|T5|Ghost
Shiny Haunter|T4|Ghost
Gengar|T2|Ghost
Shiny Gengar|Legendary|Ghost
Onix|T4|Rock
Shiny Onix|T3|Rock
Drowzee|T6|Psychic
Shiny Drowzee|T5|Psychic
Hypno|T4|Psychic
Shiny Hypno|T2|Psychic
Krabby|T6|Water
Shiny Krabby|T5|Water
Kingler|T4|Water
Shiny Kingler|T3|Water
Voltorb|T6|Electric
Shiny Voltorb|T5|Electric
Electrode|T4|Electric
Shiny Electrode|T3|Electric
Exeggcute|T6|Psychic
Shiny Exeggcute|T5|Psychic
Exeggutor|T3|Psychic
Shiny Exeggutor|T2|Psychic
Cubone|T6|Ground
Shiny Cubone|T5|Ground
Marowak|T4|Ground
Shiny Marowak|T1|Ground
Hitmonlee|T4|Fighting
Shiny Hitmonlee|T1|Fighting
Hitmonchan|T4|Fighting
Shiny Hitmonchan|T1|Fighting
Lickitung|T4|Normal
Shiny Lickitung|T3|Normal
Koffing|T6|Poison
Shiny Koffing|T5|Poison
Weezing|T4|Poison
Shiny Weezing|T3|Poison
Rhyhorn|T6|Ground
Shiny Rhyhorn|T5|Ground
Rhydon|T3|Rock
Shiny Rhydon|T2|Ground
Chansey|T4|Normal
Shiny Chansey|T3|Normal
Tangela|T4|Grass
Shiny Tangela|T2|Grass
Kangaskhan|T3|Ground
Shiny Kangaskhan|Super Rare|Fighting
Horsea|T6|Water
Shiny Horsea|T5|Water
Seadra|T5|Water
Shiny Seadra|T4|Water
Goldeen|T6|Water
Shiny Goldeen|T5|Water
Seaking|T4|Water
Shiny Seaking|T3|Water
Staryu|T6|Water
Shiny Staryu|T5|Water
Starmie|T4|Water
Shiny Starmie|T2|Water
Mr. Mime|T3|Psychic
Shiny Mr. Mime|Super Rare|Psychic
Scyther|T3|Bug
Shiny Scyther|Super Rare|Bug
Jynx|T2|Ice
Shiny Jynx|T1|Ice
Electabuzz|T2|Electric
Shiny Electabuzz|Legendary|Electric
Magmar|T2|Fire
Shiny Magmar|Legendary|Fire
Pinsir|T3|Bug
Shiny Pinsir|Super Rare|Bug
Tauros|T3|Normal
Shiny Tauros|Super Rare|Dark
Magikarp|T7|Water
Shiny Magikarp|T6|Water
Gyarados|T2|Water
Shiny Gyarados|Legendary|Water
Lapras|T2|Ice
Shiny Lapras|T1|Ice
Ditto|T7|Normal
Shiny Ditto|T7|Normal
Eevee|T6|Normal
Shiny Eevee|T5|Normal
Vaporeon|T3|Water
Shiny Vaporeon|T1|Water
Jolteon|T3|Electric
Shiny Jolteon|T1|Electric
Flareon|T3|Fire
Shiny Flareon|T1|Fire
Porygon|T5|Psychic
Shiny Porygon|T4|Psychic
Omanyte|T6|Water
Shiny Omanyte|T5|Water
Omastar|T2|Rock
Shiny Omastar|T1|Rock
Kabuto|T6|Rock
Shiny Kabuto|T5|Rock
Kabutops|T3|Rock
Shiny Kabutops|T1|Rock
Aerodactyl|T1|Rock
Shiny Aerodactyl|?|?
Snorlax|T2|Normal
Shiny Snorlax|Legendary|Normal
Articuno|?|?
Shiny Articuno|?|?
Zapdos|?|?
Shiny Zapdos|?|?
Moltres|?|?
Shiny Moltres|?|?
Dratini|T5|Dragon
Shiny Dratini|T4|Dragon
Dragonair|T4|Dragon
Shiny Dragonair|Legendary|Dragon
Dragonite|T2|Dragon
Shiny Dragonite|Mythic|Dragon
Mewtwo|?|?
Shiny Mewtwo|?|?
Mew|?|?
Shiny Mew|?|?
Chikorita|T6|Grass
Shiny Chikorita|T5|Grass
Bayleef|T5|Grass
Shiny Bayleef|T4|Grass
Meganium|T3|Grass
Shiny Meganium|T1|Grass
Cyndaquil|T6|Fire
Shiny Cyndaquil|T5|Fire
Quilava|T5|Fire
Shiny Quilava|T4|Fire
Typhlosion|T3|Fire
Shiny Typhlosion|T1|Fire
Totodile|T6|Water
Shiny Totodile|T5|Water
Croconaw|T5|Water
Shiny Croconaw|T4|Water
Feraligatr|T3|Water
Shiny Feraligatr|T1|Water
Sentret|T7|Normal
Shiny Sentret|T5|Normal
Furret|T4|Normal
Shiny Furret|T4|Normal
Hoothoot|T7|Flying
Shiny Hoothoot|T5|Flying
Noctowl|T4|Flying
Shiny Noctowl|T2|Flying
Ledyba|T6|Flying
Shiny Ledyba|T5|Flying
Ledian|T4|Bug
Shiny Ledian|T3|Fighting
Spinarak|T6|Poison
Shiny Spinarak|T5|Poison
Ariados|T4|Bug
Shiny Ariados|T3|Bug
Crobat|T3|Flying
Shiny Crobat|T2|Flying
Chinchou|T6|Electric
Shiny Chinchou|T5|Electric
Lanturn|T3|Electric
Shiny Lanturn|T2|Electric
Pichu|T6|Electric
Shiny Pichu|T5|Electric
Cleffa|T7|Normal
Shiny Cleffa|T6|Normal
Igglybuff|T7|Normal
Shiny Igglybuff|T6|Normal
Togepi|T6|Normal
Shiny Togepi|T5|Normal
Togetic|T3|Fairy
Shiny Togetic|T2|Fairy
Natu|T6|Psychic
Shiny Natu|T5|Psychic
Xatu|T3|Psychic
Shiny Xatu|T2|Ghost
Mareep|T6|Electric
Shiny Mareep|T5|Electric
Flaaffy|T5|Electric
Shiny Flaaffy|T4|Electric
Ampharos|T3|Electric
Shiny Ampharos|T1|Electric
Bellossom|T4|Grass
Shiny Bellossom|T3|Grass
Marill|T6|Water
Shiny Marill|T5|Water
Azumarill|T4|Water
Shiny Azumarill|T3|Water
Sudowoodo|T2|Rock
Shiny Sudowoodo|T1|Rock
Politoed|T4|Water
Shiny Politoed|T1|Water
Hoppip|T6|Grass
Shiny Hoppip|T5|Grass
Skiploom|T5|Grass
Shiny Skiploom|T4|Grass
Jumpluff|T4|Grass
Shiny Jumpluff|T3|Grass
Aipom|T6|Normal
Shiny Aipom|T5|Normal
Sunkern|T7|Grass
Shiny Sunkern|T5|Grass
Sunflora|T5|Grass
Shiny Sunflora|T4|Grass
Yanma|T5|Flying
Shiny Yanma|T3|Bug
Wooper|T6|Water
Shiny Wooper|T5|Water
Quagsire|T4|Water
Shiny Quagsire|T2|Ground
Espeon|T4|Psychic
Shiny Espeon|T1|Psychic
Umbreon|T4|Dark
Shiny Umbreon|T1|Dark
Murkrow|T5|Dark
Shiny Murkrow|T3|Dark
Slowking|T2|Psychic
Shiny Slowking|T1|Psychic
Misdreavus|T3|Ghost
Shiny Misdreavus|Super Rare|Ghost
Unown|?|?
Shiny Unown|?|?
Wobbuffet|T2|Psychic
Shiny Wobbuffet|Super Rare|Psychic
Girafarig|T3|Dark
Shiny Girafarig|T2|Dark
Pineco|T7|Normal
Shiny Pineco|T5|Normal
Forretress|T3|Steel
Shiny Forretress|T2|Steel
Dunsparce|T5|Normal
Shiny Dunsparce|T4|Normal
Gligar|T5|Bug
Shiny Gligar|T4|Bug
Steelix|T2|Ground
Shiny Steelix|T1|Ground
Snubbull|T6|Fairy
Shiny Snubbull|T5|Fairy
Granbull|T3|Fairy
Shiny Granbull|T2|Fairy
Qwilfish|T4|Poison
Shiny Qwilfish|T2|Poison
Scizor|T2|Bug
Shiny Scizor|Legendary|Steel
Shuckle|T5|Bug
Shiny Shuckle|T4|Bug
Heracross|T3|Fighting
Shiny Heracross|T2|Fighting
Sneasel|T4|Dark
Shiny Sneasel|T3|Dark
Teddiursa|T5|Normal
Shiny Teddiursa|T4|Normal
Ursaring|T2|Normal
Shiny Ursaring|T1|Ground
Slugma|T6|Rock
Shiny Slugma|T5|Rock
Magcargo|T3|Fire
Shiny Magcargo|T1|Rock
Swinub|T6|Ice
Shiny Swinub|T5|Ice
Piloswine|T3|Ground
Shiny Piloswine|T2|Ground
Corsola|T5|Rock
Shiny Corsola|T4|Rock
Remoraid|T6|Water
Shiny Remoraid|T5|Water
Octillery|T4|Water
Shiny Octillery|T3|Water
Delibird|T4|Ice
Shiny Delibird|T3|Ice
Mantine|T3|Flying
Shiny Mantine|T1|Flying
Skarmory|T2|Steel
Shiny Skarmory|Super Rare|Steel
Houndour|T6|Fire
Shiny Houndour|T5|Fire
Houndoom|T2|Fire
Shiny Houndoom|Super Rare|Dark
Mega Houndoom|Legendary|Fire
Kingdra|T2|Water
Shiny Kingdra|Super Rare|Water
Phanpy|T6|Normal
Shiny Phanpy|T5|Normal
Donphan|T3|Ground
Shiny Donphan|T2|Ground
Porygon2|T3|Psychic
Shiny Porygon2|T2|Psychic
Stantler|T4|Normal
Shiny Stantler|T2|Normal
Smeargle|T2|Dark
Shiny Smeargle|T1|?
Tyrogue|T5|Fighting
Shiny Tyrogue|T4|Fighting
Hitmontop|T4|Fighting
Shiny Hitmontop|T1|Fighting
Smoochum|T6|Ice
Shiny Smoochum|T5|Ice
Elekid|T6|Electric
Shiny Elekid|T5|Electric
Magby|T6|Fire
Shiny Magby|T5|Fire
Miltank|T3|Normal
Shiny Miltank|T1|Rock
Blissey|T2|Normal
Shiny Blissey|T1|Normal
Raikou|?|?
Shiny Raikou|?|?
Entei|?|?
Shiny Entei|?|?
Suicune|?|?
Shiny Suicune|?|?
Larvitar|T6|Rock
Shiny Larvitar|T5|Rock
Pupitar|T4|Rock
Shiny Pupitar|Super Rare|Ground
Tyranitar|T2|Rock
Shiny Tyranitar|Mythic|Rock
Lugia|?|?
Shiny Lugia|?|?
Ho-oh|?|?
Shiny Ho-oh|?|?
Celebi|?|?
Shiny Celebi|?|?
Treecko|T5|Grass
Shiny Treecko|T4|Grass
Grovyle|T4|Grass
Shiny Grovyle|T3|Grass
Sceptile|T2|Grass
Shiny Sceptile|Ultra Rare|Grass
Torchic|T5|Fire
Shiny Torchic|T4|Fire
Combusken|T4|Fighting
Shiny Combusken|T3|Fighting
Blaziken|T2|Fighting
Shiny Blaziken|Ultra Rare|Fighting
Mudkip|T5|Water
Shiny Mudkip|T4|Water
Marshtomp|T4|Water
Shiny Marshtomp|T3|Water
Swampert|T2|Water
Shiny Swampert|Ultra Rare|Ground
Poochyena|T5|Dark
Shiny Poochyena|T4|Dark
Mightyena|T2|Dark
Shiny Mightyena|Ultra Rare|Dark
Zigzagoon|T5|Normal
Shiny Zigzagoon|T4|Normal
Linoone|T4|Normal
Shiny Linoone|T2|Normal
Wurmple|T6|Bug
Shiny Wurmple|T5|Bug
Silcoon|T6|Bug
Shiny Silcoon|T5|Bug
Beautifly|T3|Bug
Shiny Beautifly|T1|Flying
Cascoon|T6|Bug
Shiny Cascoon|T5|Bug
Dustox|T3|Psychic
Shiny Dustox|T1|Poison
Lotad|T5|Water
Shiny Lotad|T4|Water
Lombre|T4|Water
Shiny Lombre|T3|Water
Ludicolo|T2|Water
Shiny Ludicolo|T1|Water
Seedot|T5|Grass
Shiny Seedot|T4|Grass
Nuzleaf|T2|Dark
Shiny Nuzleaf|T3|Dark
Shiftry|T2|Dark
Shiny Shiftry|T1|Grass
Taillow|T5|Flying
Shiny Taillow|T4|Flying
Swellow|T2|Flying
Shiny Swellow|Super Rare|Flying
Wingull|T5|Water
Shiny Wingull|T4|Water
Pelipper|T2|Normal
Shiny Pelipper|T1|Flying
Ralts|T5|Psychic
Shiny Ralts|T4|Psychic
Kirlia|T4|Psychic
Shiny Kirlia|T3|Psychic
Gardevoir|T2|Fairy
Shiny Gardevoir|Ultra Rare|Fairy
Surskit|T5|Water
Shiny Surskit|T4|Water
Masquerain|T3|Flying
Shiny Masquerain|T1|Flying
Shroomish|T5|Grass
Shiny Shroomish|T4|Grass
Breloom|T2|Grass
Shiny Breloom|T1|Grass
Slakoth|T5|Fighting
Shiny Slakoth|T4|Fighting
Vigoroth|T4|Normal
Shiny Vigoroth|T3|Normal
Slaking|T2|Normal
Shiny Slaking|Mythic|Normal
Nincada|T5|Ground
Shiny Nincada|T4|Ground
Ninjask|T2|Normal
Shiny Ninjask|T1|Flying
Shedinja|T2|Ghost
Shiny Shedinja|T1|Ghost
Whismur|T5|Normal
Shiny Whismur|T4|Normal
Loudred|T4|Normal
Shiny Loudred|T3|Normal
Exploud|T2|Normal
Shiny Exploud|Ultra Rare|Ice
Makuhita|T4|Fighting
Shiny Makuhita|T3|Fighting
Hariyama|T2|Fighting
Shiny Hariyama|T1|Fighting
Azurill|T4|Normal
Shiny Azurill|T3|Normal
Nosepass|T4|Rock
Shiny Nosepass|T3|Rock
Skitty|T5|Normal
Shiny Skitty|T4|Normal
Delcatty|T3|Fairy
Shiny Delcatty|T1|Fairy
Sableye|T2|Ghost
Shiny Sableye|T1|Dark
Mawile|T2|Steel
Shiny Mawile|T1|Steel
Aron|T5|Steel
Shiny Aron|T4|Steel
Lairon|T4|Steel
Shiny Lairon|T3|Steel
Aggron|T2|Steel
Shiny Aggron|Super Rare|Steel
Meditite|T5|Fighting
Shiny Meditite|T4|Fighting
Medicham|T2|Psychic
Shiny Medicham|T1|Fighting
Electrike|T5|Electric
Shiny Electrike|T4|Electric
Manectric|T2|Electric
Shiny Manectric|Ultra Rare|Electric
Plusle|T4|Electric
Shiny Plusle|T3|Electric
Minun|T4|Electric
Shiny Minun|T3|Electric
Volbeat|T3|?
Shiny Volbeat|T2|?
Illumise|T3|?
Shiny Illumise|T2|?
Roselia|T3|Grass
Shiny Roselia|T1|Grass
Gulpin|T4|?
Shiny Gulpin|T3|?
Swalot|T2|Poison
Shiny Swalot|Ultra Rare|Poison
Carvanha|T4|Water
Shiny Carvanha|T3|Water
Sharpedo|T2|Water
Shiny Sharpedo|Super Rare|Water
Wailmer|T4|Water
Shiny Wailmer|T3|Water
Wailord|T2|Water
Shiny Wailord|T1|Water
Numel|T5|Fire
Shiny Numel|T4|Fire
Camerupt|T2|Fire
Shiny Camerupt|T1|Ground
Torkoal|T2|Fire
Shiny Torkoal|Ultra Rare|Fire
Spoink|T5|Psychic
Shiny Spoink|T4|Psychic
Grumpig|T3|Psychic
Shiny Grumpig|T1|Psychic
Spinda|T4|Psychic
Shiny Spinda|T3|Psychic
Trapinch|T5|Ground
Shiny Trapinch|T4|Ground
Vibrava|T4|Ground
Shiny Vibrava|T3|Ground
Flygon|T2|Ground
Shiny Flygon|Legendary|Ground
Cacnea|T5|Grass
Shiny Cacnea|T4|Grass
Cacturne|T2|Dark
Shiny Cacturne|T1|Dark
Swablu|T5|Flying
Shiny Swablu|T4|Flying
Altaria|T2|Flying
Shiny Altaria|Super Rare|Dragon
Zangoose|T2|Normal
Shiny Zangoose|T1|Normal
Seviper|T2|Poison
Shiny Seviper|Super Rare|Poison
Lunatone|T2|Rock
Shiny Lunatone|T1|Rock
Solrock|T2|Rock
Shiny Solrock|T1|Rock
Barboach|T5|Water
Shiny Barboach|T4|Water
Whiscash|T2|Ground
Shiny Whiscash|T1|Ground
Corphish|T5|Dark
Shiny Corphish|T4|Dark
Crawdaunt|T2|Dark
Shiny Crawdaunt|T1|Dark
Baltoy|T5|Psychic
Shiny Baltoy|T4|Psychic
Claydol|T2|Ground
Shiny Claydol|T1|Ground
Lileep|?|?
Shiny Lileep|?|?
Cradily|T2|Grass
Shiny Cradily|T1|Grass
Anorith|T5|Rock
Shiny Anorith|T4|Rock
Armaldo|T2|Rock
Shiny Armaldo|Super Rare|Rock
Feebas|T5|Water
Shiny Feebas|T4|Water
Milotic|T2|Water
Shiny Milotic|Ultra Rare|Water
Castform|?|?
Shiny Castform|?|?
Kecleon|T3|Dark
Shiny Kecleon|T1|Dark
Shuppet|T5|Ghost
Shiny Shuppet|T4|Ghost
Banette|T2|Ghost
Shiny Banette|T1|Ghost
Duskull|T5|Ghost
Shiny Duskull|T4|Ghost
Dusclops|T2|Ghost
Shiny Dusclops|T1|Ghost
Tropius|T2|Grass
Shiny Tropius|Ultra Rare|Flying
Chimecho|T3|Psychic
Shiny Chimecho|T1|Psychic
Absol|T2|Dark
Shiny Absol|Legendary|Dark
Wynaut|T5|Psychic
Shiny Wynaut|T4|Psychic
Snorunt|T5|Ice
Shiny Snorunt|T4|Ice
Glalie|T2|Ice
Shiny Glalie|Ultra Rare|Ice
Spheal|T5|Ice
Shiny Spheal|T4|Ice
Sealeo|T4|Ice
Shiny Sealeo|T3|Ice
Walrein|T2|Ice
Shiny Walrein|Super Rare|Ice
Clamperl|T3|Water
Shiny Clamperl|T2|Water
Huntail|T3|Water
Shiny Huntail|T1|Water
Gorebyss|T3|Water
Shiny Gorebyss|T1|Water
Relicanth|T3|Water
Shiny Relicanth|T1|Water
Luvdisc|T3|Water
Shiny Luvdisc|T2|Water
Bagon|T5|Dragon
Shiny Bagon|T4|Dragon
Shelgon|T4|Dragon
Shiny Shelgon|T3|Dragon
Salamence|T2|Dragon
Shiny Salamence|Ultra Rare|Dragon
Beldum|T5|Steel
Shiny Beldum|T4|Steel
Metang|T4|Steel
Shiny Metang|T1|Steel
Metagross|T2|Steel
Shiny Metagross|Ultra Rare|Steel
Regirock|?|?
Shiny Regirock|?|?
Regice|?|?
Shiny Regice|?|?
Registeel|?|?
Shiny Registeel|?|?
Latios|?|?
Shiny Latios|?|?
Latias|?|?
Shiny Latias|?|?
Kyogre|?|?
Shiny Kyogre|?|?
Groudon|?|?
Shiny Groudon|?|?
Rayquaza|?|?
Shiny Rayquaza|?|?
Jirachi|?|?
Shiny Jirachi|?|?
Deoxys|?|?
Shiny Deoxys|?|?
Turtwig|T6|Grass
Shiny Turtwig|T4|Grass
Grotle|T4|Grass
Shiny Grotle|T3|Grass
Torterra|T1|Ground
Shiny Torterra|Super Rare|Ground
Chimchar|T6|Fire
Shiny Chimchar|T4|Fire
Monferno|T4|Fire
Shiny Monferno|T3|Fire
Infernape|T1|Fire
Shiny Infernape|Super Rare|Fire
Shinx|?|Electric
Shiny Shinx|?|Electric
Luxio|?|Electric
Shiny Luxio|?|Electric
Luxray|T1|Electric
Shiny Luxray|Super Rare|Electric
Cranidos|T4|Rock
Shiny Cranidos|T3|Rock
Rampardos|T1|Rock
Shiny Rampardos|Ultra Rare|Rock
Pachirisu|T2|Electric
Shiny Pachirisu|Super Rare|Electric
Lopuny|?|Fighting
Shiny Lopuny|?|Fighting
Riolu|T4|Fighting
Shiny Riolu|T3|Fighting
Lucario|T2|Steel
Shiny Lucario|Legendary|Fighting
Croagunk|?|?
Shiny Croagunk|?|?
Toxicroak|T2|Poison
Shiny Toxicroak|Super Rare|Poison
Abomasnow|T2|Grass
Mega Abomasnow|Legendary|Ice
Rhyperior|T1|Rock
Shiny Rhyperior|Legendary|Rock
Tangrowth|T1|Grass
Shiny Tangrowth|Super Rare|Grass
Leafeon|T2|Grass
Shiny Leafeon|Legendary|Grass
Glaceon|T2|Ice
Shiny Glaceon|Legendary|Ice
Gliscor|T1|Flying
Shiny Gliscor|Super Rare|Flying
Dusknoir|T1|Ghost
Shiny Dusknoir|Super Rare|Ghost
Audino|T2|
Shiny Audino||
Scolipede|T2|Bug
Mega Scolipede|T2|Bug
Trubbish|T6|Poison
Shiny Trubbish|T4|Poison
Garbodor|T1|Poison
Shiny Garbodor|Legendary|Poison
Druddigon|T2|Dragon
Shiny Druddigon|T1|Dragon
Deino|T5|Dark
Shiny Deino|T5|Dark
Zweilous|T2|Dark
Shiny Zweilous|T2|Dark
Hydreigon|T2|Dark
Shiny Hydreigon|Super Rare|Dark
Flabébé|T6|Fairy
Shiny Flabébé|T5|Fairy
Floette|T5|Fairy
Shiny Floette|T4|Fairy
Florges|T2|Fairy
Shiny Florges|Super Rare|Fairy
Skiddo|T4|Grass
Shiny Skiddo|T3|Grass
Gogoat|T1|Grass
Shiny Gogoat|Super Rare|Grass
Dragalge|T2|Poison
Mega Dragalge|T2|Poison
Sylveon|T2|Fairy
Shiny Sylveon|Legendary|Fairy
Mimikyu|T2|Fairy
Shiny Mimikyu|Super Rare|Fairy
`;
