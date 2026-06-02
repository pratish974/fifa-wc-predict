import emblem from '../assets/nation_icons/2026_FIFA_World_Cup_emblem.svg.webp';
import Flag_of_Algeria from '../assets/nation_icons/Flag_of_Algeria.svg.webp';
import Flag_of_Argentina from '../assets/nation_icons/Flag_of_Argentina.svg.webp';
import Flag_of_Australia from '../assets/nation_icons/Flag_of_Australia_(converted).svg.webp';
import Flag_of_Austria from '../assets/nation_icons/Flag_of_Austria.svg.webp';
import Flag_of_Belgium from '../assets/nation_icons/Flag_of_Belgium_(civil).svg.webp';
import Flag_of_Bosnia_and_Herzegovina from '../assets/nation_icons/Flag_of_Bosnia_and_Herzegovina.svg.webp';
import Flag_of_Brazil from '../assets/nation_icons/Flag_of_Brazil.svg.webp';
import Flag_of_Canada from '../assets/nation_icons/Flag_of_Canada_(Pantone).svg.webp';
import Flag_of_Cabo_Verde from '../assets/nation_icons/Flag_of_Cabo_Verde.svg.webp';
import Flag_of_Colombia from '../assets/nation_icons/Flag_of_Colombia.svg.webp';
import Flag_of_Croatia from '../assets/nation_icons/Flag_of_Croatia.svg.webp';
import Flag_of_Curacao from '../assets/nation_icons/Flag_of_Curaçao.svg.webp';
import Flag_of_Cote_dIvoire from "../assets/nation_icons/Flag_of_Côte_d'Ivoire.svg.webp";
import Flag_of_Ecuador from '../assets/nation_icons/Flag_of_Ecuador.svg.webp';
import Flag_of_Egypt from '../assets/nation_icons/Flag_of_Egypt.svg.webp';
import Flag_of_England from '../assets/nation_icons/Flag_of_England.svg.webp';
import Flag_of_France from '../assets/nation_icons/Flag_of_France.svg.webp';
import Flag_of_Germany from '../assets/nation_icons/Flag_of_Germany.svg.webp';
import Flag_of_Ghana from '../assets/nation_icons/Flag_of_Ghana.svg.webp';
import Flag_of_Haiti from '../assets/nation_icons/Flag_of_Haiti.svg.webp';
import Flag_of_Iran from '../assets/nation_icons/Flag_of_Iran.svg.webp';
import Flag_of_Iraq from '../assets/nation_icons/Flag_of_Iraq.svg.webp';
import Flag_of_Japan from '../assets/nation_icons/Flag_of_Japan.svg.webp';
import Flag_of_Jordan from '../assets/nation_icons/Flag_of_Jordan.svg.webp';
import Flag_of_Mexico from '../assets/nation_icons/Flag_of_Mexico.svg.webp';
import Flag_of_Morocco from '../assets/nation_icons/Flag_of_Morocco.svg.webp';
import Flag_of_New_Zealand from '../assets/nation_icons/Flag_of_New_Zealand.svg.webp';
import Flag_of_Norway from '../assets/nation_icons/Flag_of_Norway.svg.webp';
import Flag_of_Panama from '../assets/nation_icons/Flag_of_Panama.svg.webp';
import Flag_of_Paraguay from '../assets/nation_icons/Flag_of_Paraguay.svg.webp';
import Flag_of_Portugal from '../assets/nation_icons/Flag_of_Portugal_(official).svg.webp';
import Flag_of_Qatar from '../assets/nation_icons/Flag_of_Qatar.svg.webp';
import Flag_of_Saudi_Arabia from '../assets/nation_icons/Flag_of_Saudi_Arabia.svg.webp';
import Flag_of_Scotland from '../assets/nation_icons/Flag_of_Scotland.svg.webp';
import Flag_of_Senegal from '../assets/nation_icons/Flag_of_Senegal.svg.webp';
import Flag_of_South_Africa from '../assets/nation_icons/Flag_of_South_Africa.svg.webp';
import Flag_of_South_Korea from '../assets/nation_icons/Flag_of_South_Korea.svg.webp';
import Flag_of_Spain from '../assets/nation_icons/Flag_of_Spain.svg.webp';
import Flag_of_Sweden from '../assets/nation_icons/Flag_of_Sweden.svg.webp';
import Flag_of_Switzerland from '../assets/nation_icons/Flag_of_Switzerland_(Pantone).svg.webp';
import Flag_of_Czech_Republic from '../assets/nation_icons/Flag_of_the_Czech_Republic.svg.webp';
import Flag_of_DR_Congo from '../assets/nation_icons/Flag_of_the_Democratic_Republic_of_the_Congo.svg.webp';
import Flag_of_Netherlands from '../assets/nation_icons/Flag_of_the_Netherlands.svg.webp';
import Flag_of_United_States from '../assets/nation_icons/Flag_of_the_United_States.svg.webp';
import Flag_of_Tunisia from '../assets/nation_icons/Flag_of_Tunisia.svg.webp';
import Flag_of_Türkiye from '../assets/nation_icons/Flag_of_Türkiye.svg.webp';
import Flag_of_Uruguay from '../assets/nation_icons/Flag_of_Uruguay.svg.webp';
import Flag_of_Uzbekistan from '../assets/nation_icons/Flag_of_Uzbekistan.svg.webp';
import Flag_of_Curacao_alt from '../assets/nation_icons/Flag_of_Curaçao.svg.webp';

function normalize(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export const NATION_ICONS: Record<string, string> = {
  fifa_emblem: emblem,
  algeria: Flag_of_Algeria,
  argentina: Flag_of_Argentina,
  australia: Flag_of_Australia,
  austria: Flag_of_Austria,
  belgium: Flag_of_Belgium,
  bosnia_and_herzegovina: Flag_of_Bosnia_and_Herzegovina,
  brazil: Flag_of_Brazil,
  canada: Flag_of_Canada,
  cabo_verde: Flag_of_Cabo_Verde,
  colombia: Flag_of_Colombia,
  croatia: Flag_of_Croatia,
  curacao: Flag_of_Curacao,
  cote_divoire: Flag_of_Cote_dIvoire,
  ecuador: Flag_of_Ecuador,
  egypt: Flag_of_Egypt,
  england: Flag_of_England,
  france: Flag_of_France,
  germany: Flag_of_Germany,
  ghana: Flag_of_Ghana,
  haiti: Flag_of_Haiti,
  iran: Flag_of_Iran,
  iraq: Flag_of_Iraq,
  japan: Flag_of_Japan,
  jordan: Flag_of_Jordan,
  mexico: Flag_of_Mexico,
  morocco: Flag_of_Morocco,
  new_zealand: Flag_of_New_Zealand,
  norway: Flag_of_Norway,
  panama: Flag_of_Panama,
  paraguay: Flag_of_Paraguay,
  portugal: Flag_of_Portugal,
  qatar: Flag_of_Qatar,
  saudi_arabia: Flag_of_Saudi_Arabia,
  scotland: Flag_of_Scotland,
  senegal: Flag_of_Senegal,
  south_africa: Flag_of_South_Africa,
  south_korea: Flag_of_South_Korea,
  spain: Flag_of_Spain,
  sweden: Flag_of_Sweden,
  switzerland: Flag_of_Switzerland,
  czech_republic: Flag_of_Czech_Republic,
  dr_congo: Flag_of_DR_Congo,
  netherlands: Flag_of_Netherlands,
  united_states: Flag_of_United_States,
  tunisia: Flag_of_Tunisia,
  turkey: Flag_of_Türkiye,
  uruguay: Flag_of_Uruguay,
  uzbekistan: Flag_of_Uzbekistan,
  curacao_alt: Flag_of_Curacao_alt,
};

const findIconKey = (normalizedName: string): string | undefined => {
  if (NATION_ICONS[normalizedName]) {
    return normalizedName;
  }

  const underscoreName = normalizedName.replace(/\s+/g, '_');
  if (NATION_ICONS[underscoreName]) {
    return underscoreName;
  }

  const matchedKey = Object.keys(NATION_ICONS).find((key) => {
    if (key === 'fifa_emblem') return false;
    return normalizedName.includes(key) || underscoreName.includes(key);
  });

  return matchedKey;
};

export const getNationIcon = (name: string): string | undefined => {
  const normalizedInput = normalize(name);
  const key = findIconKey(normalizedInput);
  return key ? NATION_ICONS[key] : undefined;
};

export default NATION_ICONS;
