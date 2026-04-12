-- Dasmariñas STA-v3 (2025) tourist inventory → public.places
-- Run after migration adds ntdp_category + source_slug

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Immaculate Conception Church', 'Immaculate Conception Church, Zone 1, Dasmariñas, Cavite, Philippines', 'Church, Mosque, temples or other religious sites', 'See parish schedule', 14.3271422, 120.9357687, 'NTDP: Cultural Tourism. Barangay: Zone 1. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Cultural Tourism', 'immaculate-conception-church-dasma')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Museo De La Salle', 'Museo De La Salle, Fatima, Dasmariñas, Cavite, Philippines', 'Museum', 'Check museum hours', 14.3209977, 120.9610387, 'NTDP: Cultural Tourism. Barangay: Fatima. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Cultural Tourism', 'museo-de-la-salle')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Promenade Des Dasmariñas', 'Promenade Des Dasmariñas, Burol, Dasmariñas, Cavite, Philippines', 'Parks', 'Open daily', 14.3256524, 120.9561576, 'NTDP: Leisure and Entertainment Tourism. Barangay: Burol. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'promenade-des-dasmarinas')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Blumen Resort', 'Blumen Resort, Paliparan, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.2854362, 120.9919703, 'NTDP: Leisure and Entertainment Tourism. Barangay: Paliparan. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'blumen-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Cocovalley Richnez Waterpark', 'Cocovalley Richnez Waterpark, Paliparan III, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.3193958, 120.9842115, 'NTDP: Leisure and Entertainment Tourism. Barangay: Paliparan III. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'cocovalley-richnez-waterpark')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Jardin De Dasmariñas Resort & Restaurant', 'Jardin De Dasmariñas Resort & Restaurant, Sabang, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.347979400000002, 120.9238819, 'NTDP: Leisure and Entertainment Tourism. Barangay: Sabang. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'jardin-de-dasmarinas-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Kalipayan Resort Inc.', 'Kalipayan Resort Inc., Salitran 1, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.353486, 120.9372415, 'NTDP: Leisure and Entertainment Tourism. Barangay: Salitran 1. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'kalipayan-resort-inc')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Levia Garden Resort', 'Levia Garden Resort, Sampaloc 2, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.282331200000002, 120.9598803, 'NTDP: Leisure and Entertainment Tourism. Barangay: Sampaloc 2. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'levia-garden-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Medz Resort And Restaurant', 'Medz Resort And Restaurant, Paliparan, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.3007051, 120.99167729999999, 'NTDP: Leisure and Entertainment Tourism. Barangay: Paliparan. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'medz-resort-and-restaurant')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Merci Deiu Venue And Event Place', 'Merci Deiu Venue And Event Place, Sampaloc III, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact venue', 14.289623200000001, 120.9768036, 'NTDP: Leisure and Entertainment Tourism. Barangay: Sampaloc III. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'merci-deiu-venue')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Qubo Qabana Resort', 'Qubo Qabana Resort, Langkaan 1, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.2976263, 120.9485421, 'NTDP: Leisure and Entertainment Tourism. Barangay: Langkaan 1. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'qubo-qabana-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Riverbank Fun Park And Garden Resort Inc.', 'Riverbank Fun Park And Garden Resort Inc., San Agustin 2, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.3166791, 120.95188519999999, 'NTDP: Leisure and Entertainment Tourism. Barangay: San Agustin 2. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'riverbank-fun-park')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Riverside Resort', 'Riverside Resort, Salitran, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.3504335, 120.9428017, 'NTDP: Leisure and Entertainment Tourism. Barangay: Salitran. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'riverside-resort-dasma')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Saniya Resort', 'Saniya Resort, Salawag, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.3483787, 120.976293, 'NTDP: Leisure and Entertainment Tourism. Barangay: Salawag. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'saniya-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Stevenson''s Hideaway Hotel & Resort', 'Stevenson''s Hideaway Hotel & Resort, Langkaan 1, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.281737900000001, 120.945032, 'NTDP: Leisure and Entertainment Tourism. Barangay: Langkaan 1. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'stevensons-hideaway')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Swiss Resort', 'Swiss Resort, San Agustin 2, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.3201762, 120.9422011, 'NTDP: Leisure and Entertainment Tourism. Barangay: San Agustin 2. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'swiss-resort-dasma')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Tubigan Garden Resort Incorporated', 'Tubigan Garden Resort Incorporated, Paliparan III, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.319715799999999, 120.9842115, 'NTDP: Leisure and Entertainment Tourism. Barangay: Paliparan III. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'tubigan-garden-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Volet''s Hotel & Resort, Inc.', 'Volet''s Hotel & Resort, Inc., Burol Main, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.326361700000001, 120.9500164, 'NTDP: Leisure and Entertainment Tourism. Barangay: Burol Main. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'volets-hotel-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Villa Kaily Resort Hotel', 'Villa Kaily Resort Hotel, Sabang, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.3482994, 120.9238819, 'NTDP: Leisure and Entertainment Tourism. Barangay: Sabang. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'villa-kaily-resort-hotel')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Cocolada Mini Events', 'Cocolada Mini Events, Paliparan III, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact venue', 14.3200358, 120.9842115, 'NTDP: Leisure and Entertainment Tourism. Barangay: Paliparan III. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'cocolada-mini-events')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('JDLuxe Private Resort', 'JDLuxe Private Resort, Sampaloc III, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.2899432, 120.9768036, 'NTDP: Leisure and Entertainment Tourism. Barangay: Sampaloc III. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'jdluxe-private-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Sto. Niño Eco Farm Resort Co.', 'Sto. Niño Eco Farm Resort Co., Burol Main, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.3266817, 120.9500164, 'NTDP: Leisure and Entertainment Tourism. Barangay: Burol Main. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'sto-nino-eco-farm-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Laurio''s Private Resort', 'Laurio''s Private Resort, Sampaloc III, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.2902632, 120.9768036, 'NTDP: Leisure and Entertainment Tourism. Barangay: Sampaloc III. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'laurios-private-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Amayabelle Resort', 'Amayabelle Resort, Langkaan 1, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.2820579, 120.945032, 'NTDP: Leisure and Entertainment Tourism. Barangay: Langkaan 1. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'amayabelle-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Balai Ibayo Resort', 'Balai Ibayo Resort, Langkaan II, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.305525000000001, 120.932936, 'NTDP: Leisure and Entertainment Tourism. Barangay: Langkaan II. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'balai-ibayo-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('JMX Private Resort', 'JMX Private Resort, Langkaan II, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.305845, 120.932936, 'NTDP: Leisure and Entertainment Tourism. Barangay: Langkaan II. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'jmx-private-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Piscina Privata Resort', 'Piscina Privata Resort, Sampaloc IV, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.3049972, 120.9715275, 'NTDP: Leisure and Entertainment Tourism. Barangay: Sampaloc IV. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'piscina-privata-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Casa-De Teresita Private Resort', 'Casa-De Teresita Private Resort, Sampaloc III, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.2905832, 120.9768036, 'NTDP: Leisure and Entertainment Tourism. Barangay: Sampaloc III. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'casa-de-teresita-private-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('JDQ Private Resort', 'JDQ Private Resort, Langkaan II, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.306165, 120.932936, 'NTDP: Leisure and Entertainment Tourism. Barangay: Langkaan II. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'jdq-private-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Casasignora Resort', 'Casasignora Resort, Langkaan 1, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.2823779, 120.945032, 'NTDP: Leisure and Entertainment Tourism. Barangay: Langkaan 1. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'casasignora-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Blue Stone Private Resort', 'Blue Stone Private Resort, Langkaan II, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.306485, 120.932936, 'NTDP: Leisure and Entertainment Tourism. Barangay: Langkaan II. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'blue-stone-private-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('John Cezar Waterfun Resort', 'John Cezar Waterfun Resort, Sampaloc III, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.2909032, 120.9768036, 'NTDP: Leisure and Entertainment Tourism. Barangay: Sampaloc III. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'john-cezar-waterfun-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('EML Management Corporation', 'EML Management Corporation, Zone IV, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact venue', 14.325213100000001, 120.9376656, 'NTDP: Leisure and Entertainment Tourism. Barangay: Zone IV. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'eml-management-corporation')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Palmas Resort', 'Palmas Resort, Zone III, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.325151600000002, 120.9346614, 'NTDP: Leisure and Entertainment Tourism. Barangay: Zone III. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'palmas-resort-dasma')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Green and Saddle Farm Resort', 'Green and Saddle Farm Resort, San Jose, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.3342033, 120.9295851, 'NTDP: Leisure and Entertainment Tourism. Barangay: San Jose. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'green-and-saddle-farm-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Casa Annilo Rental', 'Casa Annilo Rental, Sampaloc III, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact property', 14.291223200000001, 120.9768036, 'NTDP: Leisure and Entertainment Tourism. Barangay: Sampaloc III. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'casa-annilo-rental')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Riverleaf Resort', 'Riverleaf Resort, Sampaloc III, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.2915432, 120.9768036, 'NTDP: Leisure and Entertainment Tourism. Barangay: Sampaloc III. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'riverleaf-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('CBH Private Resort', 'CBH Private Resort, Sampaloc III, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.289623200000001, 120.9771236, 'NTDP: Leisure and Entertainment Tourism. Barangay: Sampaloc III. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'cbh-private-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('Vel Garden Resort', 'Vel Garden Resort, Zone III, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.3254716, 120.9346614, 'NTDP: Leisure and Entertainment Tourism. Barangay: Zone III. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'vel-garden-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();

INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)
VALUES ('OJ Villa Private Resort', 'OJ Villa Private Resort, San Jose, Dasmariñas, Cavite, Philippines', 'Resort Complex', 'Contact resort', 14.334523299999999, 120.9295851, 'NTDP: Leisure and Entertainment Tourism. Barangay: San Jose. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).', 'Leisure and Entertainment Tourism', 'oj-villa-private-resort')
ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();
