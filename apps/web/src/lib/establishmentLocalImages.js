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

const thirteenMartyrsMonumentGallery = [
  u('13_MARTYRS_MONUMENT.png'),
  u('13_MARTYRS_MONUMENT_1.png'),
  u('13_MARTYRS_MONUMENT_2.png'),
  u('13_MARTYRS_MONUMENT_3.png'),
];

const julianFelipeMonumentGallery = [
  u('JULIAN_FELIPE_MONUMENT.png'),
  u('JULIAN_FELIPE_MONUMENT_1.png'),
  u('JULIAN_FELIPE_MONUMENT_2.png'),
  u('JULIAN_FELIPE_MONUMENT_3.png'),
];

const sanRoqueChurchGallery = [
  u('SAN_ROQUE_CHURCH.png'),
  u('SAN_ROQUE_CHURCH_1.png'),
  u('SAN_ROQUE_CHURCH_2.png'),
  u('SAN_ROQUE_CHURCH_3.png'),
];

const ladislaoDiwaMonumentGallery = [
  u('LADISLAO_DIWA_MONUMENT.png'),
  u('LADISLAO_DIWA_MONUMENT_1.png'),
  u('LADISLAO_DIWA_MONUMENT_2.png'),
  u('LADISLAO_DIWA_MONUMENT_3.png'),
];

const fortSanFelipeGallery = [
  u('FORT_SAN_FELIPE.png'),
  u('FORT_SAN_FELIPE_1.png'),
  u('FORT_SAN_FELIPE_2.png'),
  u('FORT_SAN_FELIPE_3.png'),
];

const southwoodsSportsGallery = [
  u('Southwoods_Sports_and_Country_Club.png'),
  u('Southwoods_Sports_and_Country_Club_1.png'),
  u('Southwoods_Sports_and_Country_Club_2.png'),
  u('Southwoods_Sports_and_Country_Club_3.png'),
];

const manilaSouthwoodsGolfGallery = [
  u('Manila_Southwoods_Golf_and_Country_Club.png'),
  u('Manila_Southwoods_Golf_and_Country_Club_1.png'),
  u('Manila_Southwoods_Golf_and_Country_Club_2.png'),
  u('Manila_Southwoods_Golf_and_Country_Club_3.png'),
];

const stNinoDeMolinoParishChurchGallery = [
  u('St._Ni_o_de_Molino_Parish_Church.png'),
  u('St._Ni_o_de_Molino_Parish_Church_1.png'),
  u('St._Ni_o_de_Molino_Parish_Church_2.png'),
  u('St._Ni_o_de_Molino_Parish_Church_3.png'),
];

const communityFishLandingCenterGallery = [
  u('Community_Fish_Landing_Center.png'),
  u('Community_Fish_Landing_Center_1.png'),
  u('Community_Fish_Landing_Center_2.png'),
  u('Community_Fish_Landing_Center_3.png'),
];

const ourLadyOfQueenOfPeaceParishChurchGallery = [
  u('Our_Lady_of_Queen_of_Peace_Parish_Church.png'),
  u('Our_Lady_of_Queen_of_Peace_Parish_Church_1.png'),
  u('Our_Lady_of_Queen_of_Peace_Parish_Church_2.png'),
  u('Our_Lady_of_Queen_of_Peace_Parish_Church_3.png'),
];

const senyongsMuseumGallery = [u('Senyong_s_Museum.png'), u('Senyong_s_Museum_1.png')];

const evangelicalChristianChurchBacoorGallery = [
  u('Evangelical_Christian_Church_-_Bacoor.png'),
  u('Evangelical_Christian_Church_-_Bacoor_1.png'),
  u('Evangelical_Christian_Church_-_Bacoor_2.png'),
  u('Evangelical_Christian_Church_-_Bacoor_3.png'),
];

const iglesiaFilipinaIndependenteGallery = [
  u('Iglesia_Filipina_Independente_-_Cathedral_of_St._Michael_the_Archangel.png'),
  u('Iglesia_Filipina_Independente_-_Cathedral_of_St._Michael_the_Archangel_1.png'),
  u('Iglesia_Filipina_Independente_-_Cathedral_of_St._Michael_the_Archangel_2.png'),
  u('Iglesia_Filipina_Independente_-_Cathedral_of_St._Michael_the_Archangel_3.png'),
];

const ginintuangKasaysayanNgLungsodNgBacoorGallery = [
  u('Ginintuang_Kasaysayan_ng_Lungsod_ng_Bacoor.png'),
  u('Ginintuang_Kasaysayan_ng_Lungsod_ng_Bacoor_1.png'),
  u('Ginintuang_Kasaysayan_ng_Lungsod_ng_Bacoor_2.png'),
  u('Ginintuang_Kasaysayan_ng_Lungsod_ng_Bacoor_3.png'),
];

const justiceBuenaventuraOcampoAncestralHouseGallery = [
  u('Justice_Buenaventura_A._Ocampo_Ancestral_House.png'),
  u('Justice_Buenaventura_A._Ocampo_Ancestral_House_1.png'),
  u('Justice_Buenaventura_A._Ocampo_Ancestral_House_2.png'),
  u('Justice_Buenaventura_A._Ocampo_Ancestral_House_3.png'),
];

const kademyahanNgAnakZapoteBandGallery = [
  u('Kademyahan_ng_Anak_Zapote_Band.png'),
  u('Kademyahan_ng_Anak_Zapote_Band_1.png'),
  u('Kademyahan_ng_Anak_Zapote_Band_2.png'),
  u('Kademyahan_ng_Anak_Zapote_Band_3.png'),
];

const ricardoFernandezAncestralHouseGallery = [
  u('Ricardo_Fernandez_Ancestral_House.png'),
  u('Ricardo_Fernandez_Ancestral_House_1.png'),
  u('Ricardo_Fernandez_Ancestral_House_2.png'),
  u('Ricardo_Fernandez_Ancestral_House_3.png'),
];

const immaculateConceptionChurchGallery = [
  u('Immaculate_Conception_Church.png'),
  u('Immaculate_Conception_Church_1.png'),
  u('Immaculate_Conception_Church_2.png'),
  u('Immaculate_Conception_Church_3.png'),
];

const museoDeLaSalleGallery = [
  u('Museo_De_La_Salle.png'),
  u('Museo_De_La_Salle_1.png'),
  u('Museo_De_La_Salle_2.png'),
  u('Museo_De_La_Salle_3.png'),
];

const promenadeDesDasmarinasGallery = [
  u('Promenade_Des_Dasmari_as.png'),
  u('Promenade_Des_Dasmari_as_1.png'),
  u('Promenade_Des_Dasmari_as_2.png'),
  u('Promenade_Des_Dasmari_as_3.png'),
];

const blumenResortGallery = [
  u('Blumen_Resort.png'),
  u('Blumen_Resort_1.png'),
  u('Blumen_Resort_2.png'),
  u('Blumen_Resort_3.png'),
];

const cocovalleyRichnezWaterparkGallery = [
  u('Cocovalley_Richnez_Waterpark.png'),
  u('Cocovalley_Richnez_Waterpark_1.png'),
  u('Cocovalley_Richnez_Waterpark_2.png'),
  u('Cocovalley_Richnez_Waterpark_3.png'),
];

const jardinDeDasmarinasResortRestaurantGallery = [
  u('Jardin_De_Dasmari_as_Resort___Restaurant.png'),
  u('Jardin_De_Dasmari_as_Resort___Restaurant_1.png'),
  u('Jardin_De_Dasmari_as_Resort___Restaurant_2.png'),
  u('Jardin_De_Dasmari_as_Resort___Restaurant_3.png'),
];

const kalipayanResortIncGallery = [
  u('Kalipayan_Resort_Inc..png'),
  u('Kalipayan_Resort_Inc._1.png'),
  u('Kalipayan_Resort_Inc._2.png'),
  u('Kalipayan_Resort_Inc._3.png'),
];

const leviaGardenResortGallery = [
  u('Levia_Garden_Resort.png'),
  u('Levia_Garden_Resort_1.png'),
  u('Levia_Garden_Resort_2.png'),
  u('Levia_Garden_Resort_3.png'),
];

const stEzekielMorenoParkGallery = [
  u('St._Ezekiel_Moreno_Park.png'),
  u('St._Ezekiel_Moreno_Park_1.png'),
  u('St._Ezekiel_Moreno_Park_2.png'),
  u('St._Ezekiel_Moreno_Park_3.png'),
];

const generalEdilbertoEvangelistaMonumentGallery = [
  u('General_Edilberto_Evangelista_Monument.png'),
  u('General_Edilberto_Evangelista_Monument_1.png'),
  u('General_Edilberto_Evangelista_Monument_2.png'),
  u('General_Edilberto_Evangelista_Monument_3.png'),
];

const tulayZapoteGallery = [
  u('Tulay_Zapote.png'),
  u('Tulay_Zapote_1.png'),
  u('Tulay_Zapote_2.png'),
  u('Tulay_Zapote_3.png'),
];

const monumentOfLoveGallery = [
  u('Monument_of_Love.png'),
  u('Monument_of_Love_1.png'),
  u('Monument_of_Love_2.png'),
  u('Monument_of_Love_3.png'),
];

const canariaResortGallery = [
  u('Canaria_Resort.png'),
  u('Canaria_Resort_1.png'),
  u('Canaria_Resort_2.png'),
  u('Canaria_Resort_3.png'),
];

const eagleRidgeGolfAndCountryClubGallery = [
  u('Eagle_Ridge_Golf_and_Country_Club.png'),
  u('Eagle_Ridge_Golf_and_Country_Club_1.png'),
  u('Eagle_Ridge_Golf_and_Country_Club_2.png'),
  u('Eagle_Ridge_Golf_and_Country_Club_3.png'),
];

const edensPastillasPasalubongCenterGallery = [
  u('Eden_s_Pastillas_Pasalubong_Center.png'),
  u('Eden_s_Pastillas_Pasalubong_Center_1.png'),
  u('Eden_s_Pastillas_Pasalubong_Center_2.png'),
  u('Eden_s_Pastillas_Pasalubong_Center_3.png'),
];

const felizeCafeGallery = [
  u('Felize_Cafe.png'),
  u('Felize_Cafe_1.png'),
  u('Felize_Cafe_2.png'),
  u('Felize_Cafe_3.png'),
];

const gbrMuseumGallery = [
  u('GBR_Museum.png'),
  u('GBR_Museum_1.png'),
  u('GBR_Museum_2.png'),
  u('GBR_Museum_3.png'),
];

const generalTriasCityParkGallery = [
  u('General_Trias_City_Park.png'),
  u('General_Trias_City_Park_1.png'),
  u('General_Trias_City_Park_2.png'),
  u('General_Trias_City_Park_3.png'),
];

const generalTriasPlazaRizalGallery = [
  u('General_Trias_Plaza_Rizal.png'),
  u('General_Trias_Plaza_Rizal_1.png'),
  u('General_Trias_Plaza_Rizal_2.png'),
  u('General_Trias_Plaza_Rizal_3.png'),
];

const generalTriasCulturalAndConventionCenterGallery = [
  u('General_Trias_Cultural_and_Convention_Center.png'),
  u('General_Trias_Cultural_and_Convention_Center_1.png'),
  u('General_Trias_Cultural_and_Convention_Center_2.png'),
  u('General_Trias_Cultural_and_Convention_Center_3.png'),
];

const generalTriasDairyGallery = [
  u('General_Trias_Dairy.png'),
  u('General_Trias_Dairy_1.png'),
  u('General_Trias_Dairy_2.png'),
  u('General_Trias_Dairy_3.png'),
];

const generalTriasSportsComplexGallery = [
  u('General_Trias_Sports_Complex.png'),
  u('General_Trias_Sports_Complex_1.png'),
  u('General_Trias_Sports_Complex_2.png'),
  u('General_Trias_Sports_Complex_3.png'),
];

const generalTriasPeoplesParkGallery = [
  u('General_Trias_People_s_Park.png'),
  u('General_Trias_People_s_Park_1.png'),
  u('General_Trias_People_s_Park_2.png'),
  u('General_Trias_People_s_Park_3.png'),
];

const hiddenVegaResortGallery = [
  u('Hidden_Vega_Resort.png'),
  u('Hidden_Vega_Resort_1.png'),
  u('Hidden_Vega_Resort_2.png'),
  u('Hidden_Vega_Resort_3.png'),
];

const jamsCafeGallery = [
  u('Jams_Cafe.png'),
  u('Jams_Cafe_1.png'),
  u('Jams_Cafe_2.png'),
  u('Jams_Cafe_3.png'),
];

const lawiswisKawayanGallery = [
  u('Lawiswis_Kawayan.png'),
  u('Lawiswis_Kawayan_1.png'),
  u('Lawiswis_Kawayan_2.png'),
  u('Lawiswis_Kawayan_3.png'),
];

const mangMikesValencianaGallery = [
  u('Mang_Mike_s_Valenciana.png'),
  u('Mang_Mike_s_Valenciana_1.png'),
  u('Mang_Mike_s_Valenciana_2.png'),
  u('Mang_Mike_s_Valenciana_3.png'),
];

const mapleGroveByMegaworldGallery = [
  u('Maple_Grove_by_Megaworld.png'),
  u('Maple_Grove_by_Megaworld_1.png'),
  u('Maple_Grove_by_Megaworld_2.png'),
  u('Maple_Grove_by_Megaworld_3.png'),
];

const mikaysRestaurantGallery = [
  u('Mikay_s_Restaurant.png'),
  u('Mikay_s_Restaurant_1.png'),
  u('Mikay_s_Restaurant_2.png'),
  u('Mikay_s_Restaurant_3.png'),
];

const ourLadyOfGuadalupeParishGallery = [
  u('Our_Lady_of_Guadalupe_Parish.png'),
  u('Our_Lady_of_Guadalupe_Parish_1.png'),
  u('Our_Lady_of_Guadalupe_Parish_2.png'),
  u('Our_Lady_of_Guadalupe_Parish_3.png'),
];

const servilleAnasResortGallery = [
  u('Serville_Ana_s_Resort.png'),
  u('Serville_Ana_s_Resort_1.png'),
  u('Serville_Ana_s_Resort_2.png'),
  u('Serville_Ana_s_Resort_3.png'),
];

const soakNSwimResortGallery = [
  u('Soak__N_Swim_Resort.png'),
  u('Soak__N_Swim_Resort_1.png'),
  u('Soak__N_Swim_Resort_2.png'),
  u('Soak__N_Swim_Resort_3.png'),
];

const stFrancisOfAssisiParishGallery = [
  u('St._Francis_of_Assisi_Parish.png'),
  u('St._Francis_of_Assisi_Parish_1.png'),
  u('St._Francis_of_Assisi_Parish_2.png'),
  u('St._Francis_of_Assisi_Parish_3.png'),
];

const indangCommunityMuseumGallery = [
  u('Indang_Community_Museum.png'),
  u('Indang_Community_Museum_1.png'),
  u('Indang_Community_Museum_2.png'),
  u('Indang_Community_Museum_3.png'),
];

const bonifacioShrineGallery = [
  u('Bonifacio_Shrine.png'),
  u('Bonifacio_Shrine_1.png'),
  u('Bonifacio_Shrine_2.png'),
  u('Bonifacio_Shrine_3.png'),
];

const cvsuAgriEcoTourismParkGallery = [
  u('CvSU_Agri-Eco_Tourism_Park.png'),
  u('CvSU_Agri-Eco_Tourism_Park_1.png'),
  u('CvSU_Agri-Eco_Tourism_Park_2.png'),
  u('CvSU_Agri-Eco_Tourism_Park_3.png'),
];

const loufilResortGallery = [
  u('Loufil_Resort.png'),
  u('Loufil_Resort_1.png'),
  u('Loufil_Resort_2.png'),
  u('Loufil_Resort_3.png'),
];

const marayataFarmGallery = [
  u('Marayata_Farm.png'),
  u('Marayata_Farm_1.png'),
  u('Marayata_Farm_2.png'),
  u('Marayata_Farm_3.png'),
];

const pioDeRodaGallery = [
  u('Pio_de_Roda.png'),
  u('Pio_de_Roda_1.png'),
  u('Pio_de_Roda_2.png'),
  u('Pio_de_Roda_3.png'),
];

const preciousGardenEventsPlaceGallery = [
  u('Precious_Garden_Events_Place.png'),
  u('Precious_Garden_Events_Place_1.png'),
  u('Precious_Garden_Events_Place_2.png'),
  u('Precious_Garden_Events_Place_3.png'),
];

const sanctuarioNatureFarmsGallery = [
  u('Sanctuario_Nature_Farms.png'),
  u('Sanctuario_Nature_Farms_1.png'),
  u('Sanctuario_Nature_Farms_2.png'),
  u('Sanctuario_Nature_Farms_3.png'),
];

const stGregoryTheGreatParishGallery = [
  u('St._Gregory_the_Great_Parish.png'),
  u('St._Gregory_the_Great_Parish_1.png'),
  u('St._Gregory_the_Great_Parish_2.png'),
  u('St._Gregory_the_Great_Parish_3.png'),
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
  '13 MARTYRS MONUMENT': thirteenMartyrsMonumentGallery,
  'JULIAN FELIPE MONUMENT': julianFelipeMonumentGallery,
  'SAN ROQUE CHURCH': sanRoqueChurchGallery,
  'LADISLAO DIWA MONUMENT': ladislaoDiwaMonumentGallery,
  'FORT SAN FELIPE': fortSanFelipeGallery,
  'Southwoods Sports and Country Club': southwoodsSportsGallery,
  'Manila Southwoods Golf and Country Club': manilaSouthwoodsGolfGallery,
  'St. Niño de Molino Parish Church': stNinoDeMolinoParishChurchGallery,
  'Community Fish Landing Center': communityFishLandingCenterGallery,
  'Our Lady of Queen of Peace Parish Church': ourLadyOfQueenOfPeaceParishChurchGallery,
  'Senyong\u2019s Museum': senyongsMuseumGallery,
  'Evangelical Christian Church - Bacoor': evangelicalChristianChurchBacoorGallery,
  'Iglesia Filipina Independente - Cathedral of St. Michael the Archangel':
    iglesiaFilipinaIndependenteGallery,
  'Ginintuang Kasaysayan ng Lungsod ng Bacoor': ginintuangKasaysayanNgLungsodNgBacoorGallery,
  'Justice Buenaventura A. Ocampo Ancestral House': justiceBuenaventuraOcampoAncestralHouseGallery,
  'Kademyahan ng Anak Zapote Band': kademyahanNgAnakZapoteBandGallery,
  'Ricardo Fernandez Ancestral House': ricardoFernandezAncestralHouseGallery,
  'Immaculate Conception Church': immaculateConceptionChurchGallery,
  'Museo De La Salle': museoDeLaSalleGallery,
  'Promenade Des Dasmariñas': promenadeDesDasmarinasGallery,
  'Blumen Resort': blumenResortGallery,
  'Cocovalley Richnez Waterpark': cocovalleyRichnezWaterparkGallery,
  'Jardin De Dasmariñas Resort & Restaurant': jardinDeDasmarinasResortRestaurantGallery,
  'Kalipayan Resort Inc.': kalipayanResortIncGallery,
  'Levia Garden Resort': leviaGardenResortGallery,
  'St. Ezekiel Moreno Park': stEzekielMorenoParkGallery,
  'General Edilberto Evangelista Monument': generalEdilbertoEvangelistaMonumentGallery,
  'Tulay Zapote': tulayZapoteGallery,
  'Monument of Love': monumentOfLoveGallery,
  'Canaria Resort': canariaResortGallery,
  'Eagle Ridge Golf and Country Club': eagleRidgeGolfAndCountryClubGallery,
  "Eden's Pastillas Pasalubong Center": edensPastillasPasalubongCenterGallery,
  'Felize Cafe': felizeCafeGallery,
  'GBR Museum': gbrMuseumGallery,
  'General Trias City Park': generalTriasCityParkGallery,
  'General Trias Plaza Rizal': generalTriasPlazaRizalGallery,
  'General Trias Cultural and Convention Center': generalTriasCulturalAndConventionCenterGallery,
  'General Trias Dairy': generalTriasDairyGallery,
  'General Trias Sports Complex': generalTriasSportsComplexGallery,
  "General Trias People's Park": generalTriasPeoplesParkGallery,
  'Hidden Vega Resort': hiddenVegaResortGallery,
  'Jams Cafe': jamsCafeGallery,
  'Lawiswis Kawayan': lawiswisKawayanGallery,
  "Mang Mike's Valenciana": mangMikesValencianaGallery,
  'Maple Grove by Megaworld': mapleGroveByMegaworldGallery,
  "Mikay's Restaurant": mikaysRestaurantGallery,
  'Our Lady of Guadalupe Parish': ourLadyOfGuadalupeParishGallery,
  "Serville Ana's Resort": servilleAnasResortGallery,
  "Soak 'N Swim Resort": soakNSwimResortGallery,
  'St. Francis of Assisi Parish': stFrancisOfAssisiParishGallery,
  'Indang Community Museum': indangCommunityMuseumGallery,
  'Bonifacio Shrine': bonifacioShrineGallery,
  'CvSU Agri-Eco Tourism Park': cvsuAgriEcoTourismParkGallery,
  'Loufil Resort': loufilResortGallery,
  'Marayata Farm': marayataFarmGallery,
  'Pio de Roda': pioDeRodaGallery,
  'Precious Garden Events Place': preciousGardenEventsPlaceGallery,
  'Sanctuario Nature Farms': sanctuarioNatureFarmsGallery,
  'St. Gregory the Great Parish': stGregoryTheGreatParishGallery,
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
  const urls = lookupLocalEstablishmentUrls(place.name);
  if (!urls?.length) return place;
  return {
    ...place,
    imageUrl: urls[0],
    galleryUrls: urls,
  };
}
