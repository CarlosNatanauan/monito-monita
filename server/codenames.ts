/**
 * Codenames: fun, family-friendly, Filipino Christmas aliases.
 * Each member gets one that's unique within their group.
 */
import { cryptoRandomInt, type RandomInt } from "./draw";

export const CODENAMES: readonly string[] = [
  // Noche Buena and kakanin
  "Bibingka Bandit", "Puto Bumbong Pal", "Hamon Hero", "Queso de Bola Queen", "Leche Flan Legend",
  "Lechon Lover", "Ensaymada Ace", "Buko Pandan Buddy", "Fruit Salad Fan", "Pancit Pilot",
  "Lumpia Lookout", "Kakanin Captain", "Suman Superstar", "Kutsinta Cutie", "Sapin-Sapin Sidekick",
  "Palitaw Pro", "Biko Boss", "Maja Blanca Maestro", "Ube Ninja", "Macapuno Magic",
  "Polvoron Pirate", "Yema Wizard", "Pastillas Prince", "Pastillas Princess", "Turon Tornado",
  "Champorado Champ", "Tsokolate Chief", "Salabat Sipper", "Kastanyas King", "Hot Choco Hugger",
  "Puto Puzzler", "Kesong Puti Pal", "Embutido Expert", "Morcon Mastermind", "Relleno Ranger",
  "Mechado Magician", "Menudo Mover", "Kare-Kare Keeper", "Caldereta Commander", "Afritada Ally",
  "Barbecue Bestie", "Inihaw Icon", "Spaghetti Sweetheart", "Hotdog Hotshot", "Marshmallow Mayor",
  "Pandesal Prodigy", "Ensalada Explorer", "Mango Float Fairy", "Graham Genius", "Cassava Cake Cadet",
  "Buko Pie Baron", "Egg Pie Eagle", "Brazo Brigadier", "Silvanas Sentinel", "Sans Rival Racer",
  "Food for the Gods Guardian", "Crinkles Crusader", "Otap Owl", "Piaya Pioneer", "Barquillos Bard",
  "Hopia Hopper", "Mamon Monarch", "Pianono Pianist", "Tikoy Tiger", "Kalamay Kid",
  "Espasol Spy", "Tupig Trooper", "Bukayo Buccaneer", "Pinipig Pixie", "Halo-Halo Harpist",
  "Taho Tracker", "Sorbetes Sorcerer", "Dirty Ice Cream Darling", "Banana Cue Baller", "Kamote Cue Comet",
  "Maruya Mascot", "Puto Maya Mapmaker", "Arroz Caldo Astronaut", "Lugaw Lifeguard", "Goto Guru",
  "Sinigang Singer", "Adobo Admiral", "Tinola Tinkerer", "Bulalo Bodyguard", "Lechon Kawali Knight",
  "Chicharon Champion", "Sisig Sheriff", "Tapsilog Trailblazer", "Hamonado Hotshot", "Cheese Roll Charmer",
  "Spanish Bread Spy", "Pan de Coco Comet", "Monay Mermaid", "Kababayan Knight", "Tablea Tycoon",
  "Barako Brewer", "Ginger Tea Genie", "Torta Tumbler", "Atchara Artist", "Kakanin Courier",
  "Buko Juice Jester", "Sago't Gulaman Sailor", "Calamansi Cupid", "Uraro Unicorn", "Galletas Gecko",
  "Rosquillos Rover", "Broas Balladeer", "Masareal Marshal", "Sampalok Sprinter", "Chestnut Chaser",
  "Fruitcake Philosopher", "Round Fruit Rookie", "Puto Seko Scout", "Ube Halaya Hugger", "Leche Flan Lookout",
  // Christmas things and traditions
  "Parol Patrol", "Parol Painter", "Simbang Gabi Scout", "Belen Buddy", "Monito Mystery",
  "Monita Marvel", "Aguinaldo Agent", "Aguinaldo Angel", "Noche Buena Ninja", "Media Noche Maverick",
  "Caroling Captain", "Tambourine Titan", "Tansan Drummer", "Capiz Crafter", "Bamboo Parol Builder",
  "Tinsel Tamer", "Ribbon Ranger", "Gift Wrap Wizard", "Laso Legend", "Regalo Rocket",
  "Paskong Pinoy Pro", "Christmas Comet", "Fake Snow Fanatic", "Jingle Jeepney", "Jeepney Jingler",
  "Tricycle Twinkle", "Karaoke King", "Videoke Virtuoso", "Mic Drop Maestro", "Dad Joke Dynamo",
  "Pamasko Partner", "Ninong Navigator", "Ninang Ninja", "Mano Po Master", "Lola's Favorite",
  "Bunutan Brainiac", "Exchange Gift Envoy", "Wishlist Whiz", "Sikreto Sleuth", "Monito Magnet",
  "Monita Mischief", "Lusis Lightkeeper", "Torotot Trumpeter", "13th Month Hero", "Tiangge Treasure Hunter",
  "Divisoria Dasher", "Tawad Master", "Pasalubong Pal", "Balikbayan Box Hero", "Dance Number Diva",
  "Group Photo Poser", "Kris Kringle Kid", "Star Lantern Lookout", "Christmas Light Tangler", "Belenismo Buddy",
  "Simbang Gabi Sleepyhead", "Puto Bumbong Pilot", "Noche Buena Navigator", "Exchange Day Elf", "Parol Pilot",
];

/**
 * A random codename not in `taken`. If the whole list is used up (only
 * possible with many removed members), adds a number: "Parol Patrol 2".
 */
export function pickCodename(taken: Iterable<string>, random: RandomInt = cryptoRandomInt): string {
  const used = new Set(taken);
  const available = CODENAMES.filter((name) => !used.has(name));
  if (available.length > 0) return available[random(available.length)];

  for (let n = 2; ; n++) {
    const numbered = CODENAMES.map((name) => `${name} ${n}`).filter((name) => !used.has(name));
    if (numbered.length > 0) return numbered[random(numbered.length)];
  }
}
