/**
 * Bundled establishment photos (same set as `apps/mobile/assets/images/`).
 * Served from `public/establishments/` → `/establishments/<file>.png`.
 */
function basePath() {
  const b = import.meta.env.BASE_URL || '/';
  return b.endsWith('/') ? b : `${b}/`;
}

function u(name) {
  return `${basePath()}establishments/${name}`;
}

const asadorGallery = [u('Asador.png'), u('Asador_1.png'), u('Asador_2.png'), u('Asador_3.png')];

const arocarriaGallery = [
  u('Arocarria.png'),
  u('Arocarria_2.png'),
  u('Arocarria_3.png'),
  u('Arocarria_4.png'),
];

const msslGallery = [
  u('MSSL_Resort_and_Balite_Falls.png'),
  u('MSSL_Resort_and_Balite_Falls_1.png'),
  u('MSSL_Resort_and_Balite_Falls_2.png'),
  u('MSSL_Resort_and_Balite_Falls_3.png'),
];

const teresitozGallery = [
  u('Teresitoz.png'),
  u('Teresitoz_1.png'),
  u('Teresitoz_2.png'),
  u('Teresitoz_3.png'),
];

const kainanSaSaginganGallery = [
  u('Kainan_sa_Sagingan.png'),
  u('Kainan_sa_Sagingan_1.png'),
  u('Kainan_sa_Sagingan_2.png'),
  u('Kainan_sa_Sagingan_3.png'),
];

const patriciasPatriciosGallery = [
  u('Patricia_s_Patricios.png'),
  u('Patricia_s_Patricios_1.png'),
  u('Patricia_s_Patricios_2.png'),
  u('Patricia_s_Patricios_3.png'),
];

const naturesDinnerGallery = [
  u('Nature_s_Dinner.png'),
  u('Nature_s_Dinner_1.png'),
  u('Nature_s_Dinner_2.png'),
  u('Nature_s_Dinner_3.png'),
];

const cafeJeriahGallery = [
  u('Cafe_Jeriah.png'),
  u('Cafe_Jeriah_1.png'),
  u('Cafe_Jeriah_2.png'),
  u('Cafe_Jeriah_3.png'),
];

const kashingBistroGallery = [
  u('Kashing_s_Bistro_1.png'),
  u('Kashing_s_Bistro_2.png'),
  u('Kashing_s_Bistro_3.png'),
  u('Kashing_s_Bistro_4.png'),
];

const alingNeneBinalotGallery = [
  u('The_Original_Aling_Nene_s_Special_Binalot.png'),
  u('The_Original_Aling_Nene_s_Special_Binalot_1.png'),
  u('The_Original_Aling_Nene_s_Special_Binalot_2.png'),
  u('The_Original_Aling_Nene_s_Special_Binalot_3.png'),
];

const villaTheresaResortGallery = [
  u('VILLA_THERESA_RESORT.png'),
  u('VILLA_THERESA_RESORT_1.png'),
  u('VILLA_THERESA_RESORT_2.png'),
  u('VILLA_THERESA_RESORT_3.png'),
];

const cleoByTheBlueLeafGallery = [
  u('Cleo_by_the_Blue_Leaf.png'),
  u('Cleo_by_the_Blue_Leaf_2.png'),
  u('Cleo_by_the_Blue_Leaf_3.png'),
  u('Cleo_by_the_Blue_Leaf_4.png'),
];

const sanLazaroLeisureParkGallery = [
  u('San_Lazaro_Leisure_Park.png'),
  u('San_Lazaro_Leisure_Park_1.png'),
  u('San_Lazaro_Leisure_Park_2.png'),
  u('San_Lazaro_Leisure_Park_3.png'),
];

const carmonaRaceTrackIncGallery = [
  u('Carmona_Race_Track__Inc.png'),
  u('Carmona_Race_Track__Inc_1.png'),
  u('Carmona_Race_Track__Inc_2.png'),
  u('Carmona_Race_Track__Inc_3.png'),
];

const mangrovePlantationGallery = [
  u('Mangrove_Plantation.png'),
  u('Mangrove_Plantation_1.png'),
  u('Mangrove_Plantation_2.png'),
  u('Mangrove_Plantation_3.png'),
];

const bacoorFamilyEcoParkGallery = [
  u('Bacoor_Family_Eco_Park.png'),
  u('Bacoor_Family_Eco_Park_1.png'),
  u('Bacoor_Family_Eco_Park_2.png'),
  u('Bacoor_Family_Eco_Park_3.png'),
];

const prinzaDamGallery = [
  u('Prinza_Dam.png'),
  u('Prinza_Dam_1.png'),
  u('Prinza_Dam_2.png'),
  u('Prinza_Dam_3.png'),
];

const molinoDamGallery = [
  u('Molino_Dam.png'),
  u('Molino_Dam_1.png'),
  u('Molino_Dam_2.png'),
  u('Molino_Dam_3.png'),
];

const coffeeCultureMuralGallery = [
  u('Coffee_Culture_and_Heritage_Mural_Project.png'),
  u('Coffee_Culture_and_Heritage_Mural_Project_1.png'),
  u('Coffee_Culture_and_Heritage_Mural_Project_2.png'),
  u('Coffee_Culture_and_Heritage_Mural_Project_3.png'),
];

const bellsMiniResortGallery = [
  u('BELL_S_MINI_RESORT.png'),
  u('BELL_S_MINI_RESORT_1.png'),
  u('BELL_S_MINI_RESORT_2.png'),
  u('BELL_S_MINI_RESORT_3.png'),
];

const tagpuanSaKabukiranGallery = [
  u('Tagpuan_sa_Kabukiran.png'),
  u('Tagpuan_sa_Kabukiran_1.png'),
  u('Tagpuan_sa_Kabukiran_2.png'),
  u('Tagpuan_sa_Kabukiran_3.png'),
];

const amysResortGallery = [
  u('AMY_S_RESORT.png'),
  u('AMY_S_RESORT_1.png'),
  u('AMY_S_RESORT_2.png'),
  u('AMY_S_RESORT_3.png'),
];

const swissResortGallery = [
  u('Swiss_Resort.png'),
  u('Swiss_Resort_1.png'),
  u('Swiss_Resort_2.png'),
  u('Swiss_Resort_3.png'),
];

const emlEventsPlaceGallery = [
  u('EML_Events_Place.png'),
  u('EML_Events_Place_1.png'),
  u('EML_Events_Place_2.png'),
  u('EML_Events_Place_3.png'),
];

const casaAnniloRentalGallery = [
  u('Casa_Annilo_Rental.png'),
  u('Casa_Annilo_Rental_1.png'),
  u('Casa_Annilo_Rental_2.png'),
  u('Casa_Annilo_Rental_3.png'),
];

const cbhPrivateResortGallery = [
  u('CBH_Private_Resort.png'),
  u('CBH_Private_Resort_1.png'),
  u('CBH_Private_Resort_2.png'),
  u('CBH_Private_Resort_3.png'),
];

const casaDeTeresitaPrivateResortGallery = [
  u('Casa-De_Teresita_Private_Resort.png'),
  u('Casa-De_Teresita_Private_Resort_1.png'),
  u('Casa-De_Teresita_Private_Resort_2.png'),
  u('Casa-De_Teresita_Private_Resort_3.png'),
];

const riverleafResortGallery = [
  u('Riverleaf_Resort.png'),
  u('Riverleaf_Resort_1.png'),
  u('Riverleaf_Resort_2.png'),
  u('Riverleaf_Resort_3.png'),
];

const villaKailyResortHotelGallery = [
  u('Villa_Kaily_Resort_Hotel.png'),
  u('Villa_Kaily_Resort_Hotel_1.png'),
  u('Villa_Kaily_Resort_Hotel_2.png'),
  u('Villa_Kaily_Resort_Hotel_3.png'),
];

const voletsHotelResortIncGallery = [
  u('Volet_s_Hotel___Resort__Inc._1.png'),
  u('Volet_s_Hotel___Resort__Inc._2.png'),
  u('Volet_s_Hotel___Resort__Inc._3.png'),
];

const tubiganGardenResortIncorporatedGallery = [
  u('Tubigan_Garden_Resort_Incorporated.png'),
  u('Tubigan_Garden_Resort_Incorporated_1.png'),
  u('Tubigan_Garden_Resort_Incorporated_2.png'),
  u('Tubigan_Garden_Resort_Incorporated_3.png'),
];

const blueStonePrivateResortGallery = [
  u('Blue_Stone_Private_Resort.png'),
  u('Blue_Stone_Private_Resort_1.png'),
  u('Blue_Stone_Private_Resort_2.png'),
  u('Blue_Stone_Private_Resort_3.png'),
];

const lauriosPrivateResortGallery = [
  u('Laurio_s_Private_Resort.png'),
  u('Laurio_s_Private_Resort_1.png'),
  u('Laurio_s_Private_Resort_2.png'),
  u('Laurio_s_Private_Resort_3.png'),
];

const amayabelleResortGallery = [
  u('Amayabelle_Resort.png'),
  u('Amayabelle_Resort_1.png'),
  u('Amayabelle_Resort_2.png'),
  u('Amayabelle_Resort_3.png'),
];

const johnCezarWaterfunResortGallery = [
  u('John_Cezar_Waterfun_Resort.png'),
  u('John_Cezar_Waterfun_Resort_1.png'),
  u('John_Cezar_Waterfun_Resort_2.png'),
  u('John_Cezar_Waterfun_Resort_3.png'),
];

const palmasResortGallery = [
  u('Palmas_Resort.png'),
  u('Palmas_Resort_1.png'),
  u('Palmas_Resort_2.png'),
  u('Palmas_Resort_3.png'),
];

const stoNinoEcoFarmResortCoGallery = [
  u('Sto._Ni_o_Eco_Farm_Resort_Co..png'),
  u('Sto._Ni_o_Eco_Farm_Resort_Co._1.png'),
  u('Sto._Ni_o_Eco_Farm_Resort_Co._2.png'),
  u('Sto._Ni_o_Eco_Farm_Resort_Co._3.png'),
];

const ojVillaPrivateResortGallery = [
  u('OJ_Villa_Private_Resort.png'),
  u('OJ_Villa_Private_Resort_1.png'),
  u('OJ_Villa_Private_Resort_2.png'),
  u('OJ_Villa_Private_Resort_3.png'),
];

const jdluxePrivateResortGallery = [
  u('JDLuxe_Private_Resort.png'),
  u('JDLuxe_Private_Resort_1.png'),
  u('JDLuxe_Private_Resort_2.png'),
  u('JDLuxe_Private_Resort_3.png'),
];

const casasignoraResortGallery = [
  u('Casasignora_Resort.png'),
  u('Casasignora_Resort_1.png'),
  u('Casasignora_Resort_2.png'),
  u('Casasignora_Resort_3.png'),
];

const jdqPrivateResortGallery = [
  u('JDQ_Private_Resort.png'),
  u('JDQ_Private_Resort_1.png'),
  u('JDQ_Private_Resort_2.png'),
  u('JDQ_Private_Resort_3.png'),
];

const cocoladaMiniEventsGallery = [
  u('Cocolada_Mini_Events.png'),
  u('Cocolada_Mini_Events_1.png'),
  u('Cocolada_Mini_Events_2.png'),
  u('Cocolada_Mini_Events_3.png'),
];

const velGardenResortGallery = [
  u('Vel_Garden_Resort.png'),
  u('Vel_Garden_Resort_1.png'),
  u('Vel_Garden_Resort_2.png'),
  u('Vel_Garden_Resort_3.png'),
];

const jmxPrivateResortGallery = [
  u('JMX_Private_Resort.png'),
  u('JMX_Private_Resort_1.png'),
  u('JMX_Private_Resort_2.png'),
  u('JMX_Private_Resort_3.png'),
];

const balaiIbayoResortGallery = [
  u('Balai_Ibayo_Resort.png'),
  u('Balai_Ibayo_Resort_1.png'),
  u('Balai_Ibayo_Resort_2.png'),
  u('Balai_Ibayo_Resort_3.png'),
];

const greenAndSaddleFarmResortGallery = [
  u('Green_and_Saddle_Farm_Resort.png'),
  u('Green_and_Saddle_Farm_Resort_1.png'),
  u('Green_and_Saddle_Farm_Resort_2.png'),
  u('Green_and_Saddle_Farm_Resort_3.png'),
];

const piscinaPrivataResortGallery = [
  u('Piscina_Privata_Resort.png'),
  u('Piscina_Privata_Resort_1.png'),
  u('Piscina_Privata_Resort_2.png'),
  u('Piscina_Privata_Resort_3.png'),
];

const riverbankFunParkGallery = [
  u('Riverbank_Fun_Park_And_Garden_Resort_Inc..png'),
  u('Riverbank_Fun_Park_And_Garden_Resort_Inc._1.png'),
  u('Riverbank_Fun_Park_And_Garden_Resort_Inc._2.png'),
  u('Riverbank_Fun_Park_And_Garden_Resort_Inc._3.png'),
];

const riversideResortGallery = [
  u('Riverside_Resort.png'),
  u('Riverside_Resort_1.png'),
  u('Riverside_Resort_2.png'),
  u('Riverside_Resort_3.png'),
];

const merciDeiuVenueGallery = [
  u('Merci_Deiu_Venue_And_Event_Place.png'),
  u('Merci_Deiu_Venue_And_Event_Place_1.png'),
  u('Merci_Deiu_Venue_And_Event_Place_2.png'),
  u('Merci_Deiu_Venue_And_Event_Place_3.png'),
];

const stevensonsHideawayGallery = [
  u('Stevenson_s_Hideaway_Hotel___Resort.png'),
  u('Stevenson_s_Hideaway_Hotel___Resort_1.png'),
  u('Stevenson_s_Hideaway_Hotel___Resort_2.png'),
  u('Stevenson_s_Hideaway_Hotel___Resort_3.png'),
];

const quboQabanaResortGallery = [
  u('Qubo_Qabana_Resort.png'),
  u('Qubo_Qabana_Resort_1.png'),
  u('Qubo_Qabana_Resort_2.png'),
  u('Qubo_Qabana_Resort_3.png'),
];

const saniyaResortGallery = [
  u('Saniya_Resort.png'),
  u('Saniya_Resort_1.png'),
  u('Saniya_Resort_2.png'),
  u('Saniya_Resort_3.png'),
];

const medzResortGallery = [
  u('Medz_Resort_And_Restaurant.png'),
  u('Medz_Resort_And_Restaurant_1.png'),
  u('Medz_Resort_And_Restaurant_2.png'),
  u('Medz_Resort_And_Restaurant_3.png'),
];

const aurorasGallery = [
  u('AURORA_S.png'),
  u('AURORA_S_1.png'),
  u('AURORA_S_2.png'),
  u('AURORA_S_3.png'),
];

const chefooRestaurantGallery = [
  u('CHEFOO_RESTAURANT.png'),
  u('CHEFOO_RESTAURANT_1.png'),
  u('CHEFOO_RESTAURANT_2.png'),
  u('CHEFOO_RESTAURANT_3.png'),
];

const asaoGrillGallery = [
  u('ASAO_GRILL.png'),
  u('ASAO_GRILL_1.png'),
  u('ASAO_GRILL_2.png'),
  u('ASAO_GRILL_3.png'),
];

const pangilinanAncestralGallery = [
  u('PANGILINAN_ANCESTRAL.png'),
  u('PANGILINAN_ANCESTRAL_1.png'),
  u('PANGILINAN_ANCESTRAL_2.png'),
  u('PANGILINAN_ANCESTRAL_3.png'),
];

const teatroBaileDeCaviteGallery = [
  u('TEATRO_BAILE_DE_CAVITE.png'),
  u('TEATRO_BAILE_DE_CAVITE_1.png'),
  u('TEATRO_BAILE_DE_CAVITE_2.png'),
  u('TEATRO_BAILE_DE_CAVITE_3.png'),
];

const corregidorBeachGallery = [
  u('CORREGIDOR_BEACH.png'),
  u('CORREGIDOR_BEACH_1.png'),
  u('CORREGIDOR_BEACH_2.png'),
  u('CORREGIDOR_BEACH_3.png'),
];

const montanoHallGallery = [
  u('MONTANO_HALL.png'),
  u('MONTANO_HALL_1.png'),
  u('MONTANO_HALL_2.png'),
  u('MONTANO_HALL_3.png'),
];

const caviteCityPublicMarketGallery = [
  u('CAVITE_CITY_PUBLIC_MARKET.png'),
  u('CAVITE_CITY_PUBLIC_MARKET_1.png'),
  u('CAVITE_CITY_PUBLIC_MARKET_2.png'),
  u('CAVITE_CITY_PUBLIC_MARKET_3.png'),
];

const casaViejaGallery = [
  u('CASA_VIEJA.png'),
  u('CASA_VIEJA_1.png'),
  u('CASA_VIEJA_2.png'),
  u('CASA_VIEJA_3.png'),
];

const baloysGallery = [
  u('BALOY_S.png'),
  u('BALOY_S_1.png'),
  u('BALOY_S_2.png'),
  u('BALOY_S_3.png'),
];

const villaGenerosaGallery = [
  u('VILLA_GENEROSA.png'),
  u('VILLA_GENEROSA_1.png'),
  u('VILLA_GENEROSA_2.png'),
  u('VILLA_GENEROSA_3.png'),
];

const hattdysKitchenGallery = [
  u('HATTDYS_KITCHEN.png'),
  u('HATTDYS_KITCHEN_1.png'),
  u('HATTDYS_KITCHEN_2.png'),
  u('HATTDYS_KITCHEN_3.png'),
];

const govSamonteCircleGallery = [
  u('GOV._SAMONTE_CIRCLE.png'),
  u('GOV._SAMONTE_CIRCLE_1.png'),
  u('GOV._SAMONTE_CIRCLE_2.png'),
  u('GOV._SAMONTE_CIRCLE_3.png'),
];

const alingIkasCarinderiaGallery = [
  u('ALING_IKA_S_CARINDERIA.png'),
  u('ALING_IKA_S_CARINDERIA_1.png'),
  u('ALING_IKA_S_CARINDERIA_2.png'),
  u('ALING_IKA_S_CARINDERIA_3.png'),
];

const tribunalHouseOfNoveletaGallery = [
  u('Tribunal_House_of_Noveleta.png'),
  u('Tribunal_House_of_Noveleta_1.png'),
  u('Tribunal_House_of_Noveleta_2.png'),
  u('Tribunal_House_of_Noveleta_3.png'),
];

const LOCAL_MEDIA = {
  Asador: asadorGallery,
  Arocarria: arocarriaGallery,
  'MSSL Resort and Balite Falls': msslGallery,
  Teresitoz: teresitozGallery,
  'Kainan sa Sagingan': kainanSaSaginganGallery,
  "Patricia's Patricio's": patriciasPatriciosGallery,
  "Nature's Dinner": naturesDinnerGallery,
  'Café Jeriah': cafeJeriahGallery,
  "Kashing's Bistro": kashingBistroGallery,
  "The Original Aling Nene's Special Binalot": alingNeneBinalotGallery,
  'VILLA THERESA RESORT': villaTheresaResortGallery,
  'Cleo by the Blue Leaf': cleoByTheBlueLeafGallery,
  'San Lazaro Leisure Park': sanLazaroLeisureParkGallery,
  'Carmona Race Track, Inc.': carmonaRaceTrackIncGallery,
  'Mangrove Plantation': mangrovePlantationGallery,
  'Bacoor Family Eco Park': bacoorFamilyEcoParkGallery,
  'Prinza Dam': prinzaDamGallery,
  'Molino Dam': molinoDamGallery,
  'Coffee Culture and Heritage Mural Project': coffeeCultureMuralGallery,
  "BELL'S MINI RESORT": bellsMiniResortGallery,
  'Tagpuan sa Kabukiran': tagpuanSaKabukiranGallery,
  "AMY'S RESORT": amysResortGallery,
  'Swiss Resort': swissResortGallery,
  'EML Events Place': emlEventsPlaceGallery,
  'Casa Annilo Rental': casaAnniloRentalGallery,
  'CBH Private Resort': cbhPrivateResortGallery,
  'Casa-De Teresita Private Resort': casaDeTeresitaPrivateResortGallery,
  'Riverleaf Resort': riverleafResortGallery,
  'Villa Kaily Resort Hotel': villaKailyResortHotelGallery,
  "Volet's Hotel & Resort, Inc.": voletsHotelResortIncGallery,
  'Tubigan Garden Resort Incorporated': tubiganGardenResortIncorporatedGallery,
  'Blue Stone Private Resort': blueStonePrivateResortGallery,
  "Laurio's Private Resort": lauriosPrivateResortGallery,
  'Amayabelle Resort': amayabelleResortGallery,
  'John Cezar Waterfun Resort': johnCezarWaterfunResortGallery,
  'Palmas Resort': palmasResortGallery,
  'Sto. Niño Eco Farm Resort Co.': stoNinoEcoFarmResortCoGallery,
  'OJ Villa Private Resort': ojVillaPrivateResortGallery,
  'JDLuxe Private Resort': jdluxePrivateResortGallery,
  'Casasignora Resort': casasignoraResortGallery,
  'JDQ Private Resort': jdqPrivateResortGallery,
  'Cocolada Mini Events': cocoladaMiniEventsGallery,
  'Vel Garden Resort': velGardenResortGallery,
  'JMX Private Resort': jmxPrivateResortGallery,
  'Balai Ibayo Resort': balaiIbayoResortGallery,
  'Green and Saddle Farm Resort': greenAndSaddleFarmResortGallery,
  'Piscina Privata Resort': piscinaPrivataResortGallery,
  'Riverbank Fun Park And Garden Resort Inc.': riverbankFunParkGallery,
  'Riverside Resort': riversideResortGallery,
  'Merci Deiu Venue And Event Place': merciDeiuVenueGallery,
  "Stevenson's Hideaway Hotel & Resort": stevensonsHideawayGallery,
  'Qubo Qabana Resort': quboQabanaResortGallery,
  'Saniya Resort': saniyaResortGallery,
  'Medz Resort And Restaurant': medzResortGallery,
  "AURORA'S": aurorasGallery,
  'CHEFOO RESTAURANT': chefooRestaurantGallery,
  'ASAO GRILL': asaoGrillGallery,
  'PANGILINAN ANCESTRAL': pangilinanAncestralGallery,
  'TEATRO BAILE DE CAVITE': teatroBaileDeCaviteGallery,
  'CORREGIDOR BEACH': corregidorBeachGallery,
  'MONTANO HALL': montanoHallGallery,
  'CAVITE CITY PUBLIC MARKET': caviteCityPublicMarketGallery,
  'CASA VIEJA': casaViejaGallery,
  "BALOY'S": baloysGallery,
  'VILLA GENEROSA': villaGenerosaGallery,
  'HATTDYS KITCHEN': hattdysKitchenGallery,
  'GOV. SAMONTE CIRCLE/SASH': govSamonteCircleGallery,
  "ALING IKA'S CARINDERIA": alingIkasCarinderiaGallery,
  'Tribunal House of Noveleta': tribunalHouseOfNoveletaGallery,
};

function lookupLocalEstablishmentUrls(name) {
  const raw = String(name ?? '').trim();
  if (!raw) return undefined;
  if (LOCAL_MEDIA[raw]) return LOCAL_MEDIA[raw];
  const key = Object.keys(LOCAL_MEDIA).find((k) => k.toLowerCase() === raw.toLowerCase());
  return key ? LOCAL_MEDIA[key] : undefined;
}

/**
 * @param {object} place rowToPlace output
 * @returns {object}
 */
export function enrichPlaceWithLocalEstablishmentMedia(place) {
  if (place.fromAdminCms || place.imageUrl || place.galleryUrls?.length) {
    return place;
  }
  const urls = lookupLocalEstablishmentUrls(place.name);
  if (!urls?.length) return place;
  return {
    ...place,
    imageUrl: urls[0],
    galleryUrls: urls,
  };
}
