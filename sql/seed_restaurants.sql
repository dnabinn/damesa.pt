-- Da Mesa — 28 Restaurant Seed Data (Lisboa focus)
-- Run AFTER schema.sql

INSERT INTO public.restaurants (name, slug, description, cuisine_type, city, address, phone, price_range, capacity, status, subscription) VALUES

-- PORTUGUESE
('Taberna da Rua das Flores', 'taberna-rua-flores', 'Cozinha portuguesa tradicional no coração do Chiado. Petiscos e pratos do dia com produtos locais.', 'Portuguesa', 'Lisboa', 'Rua das Flores 103, 1200-195 Lisboa', '+351 213 479 418', '€€', 45, 'active', 'pro'),

('Solar dos Presuntos', 'solar-dos-presuntos', 'Restaurante clássico lisboeta especializado em cozinha alentejana e transmontana. Presunto, bacalhau e carne de porco preto.', 'Portuguesa', 'Lisboa', 'Rua das Portas de Santo Antão 150, 1150-268 Lisboa', '+351 213 424 253', '€€€', 80, 'active', 'pro'),

('A Cevicheria', 'a-cevicheria', 'Cevicheria moderna com influências peruanas e portuguesas. Menu de degustação criativo com peixe fresco.', 'Peruana', 'Lisboa', 'Rua Dom Pedro V 129, 1250-096 Lisboa', '+351 218 038 815', '€€€', 35, 'active', 'pro'),

('Tasca do Chico', 'tasca-do-chico', 'Tasca típica no Bairro Alto com fado ao vivo. Pratos caseiros, vinho da casa e ambiente autêntico.', 'Portuguesa', 'Lisboa', 'Rua do Diário de Notícias 39, 1200-142 Lisboa', '+351 961 339 696', '€€', 30, 'active', 'free'),

('Zé da Mouraria', 'ze-da-mouraria', 'Restaurante popular na Mouraria com receitas de família. Bacalhau à Brás e caldo verde imbatíveis.', 'Portuguesa', 'Lisboa', 'Rua João do Outeiro 24, 1100-319 Lisboa', '+351 218 874 396', '€', 50, 'active', 'free'),

-- SEAFOOD
('Time Out Market — Palco', 'timeout-market-palco', 'Mesa partilhada no Time Out Market com os melhores chefs de Lisboa. Conceito de mercado gourmet junto ao Tejo.', 'Marisco', 'Lisboa', 'Av. 24 de Julho, Mercado da Ribeira, 1200-479 Lisboa', '+351 210 607 403', '€€', 100, 'active', 'enterprise'),

('Cervejaria Ramiro', 'cervejaria-ramiro', 'A marisqueira mais famosa de Lisboa. Sapateira, gambas, percebes e prego de veado para finalizar.', 'Marisco', 'Lisboa', 'Av. Almirante Reis 1H, 1150-007 Lisboa', '+351 213 851 024', '€€€', 120, 'active', 'enterprise'),

('Tasca do Pescador', 'tasca-do-pescador', 'Pequena tasca de peixe fresco no Cais do Sodré. Especialidade em cataplana de marisco e arroz de lingueirão.', 'Marisco', 'Lisboa', 'Rua de Santos-o-Velho 14, 1200-808 Lisboa', '+351 213 972 424', '€€', 40, 'active', 'pro'),

('Mar à Vista', 'mar-a-vista', 'Restaurante de frutos do mar com vista para o Tejo em Belém. Amêijoas, lulas e robalo grelhado.', 'Marisco', 'Lisboa', 'Av. de Brasília, Pavilhão Poente, 1400-038 Lisboa', '+351 213 620 000', '€€€', 70, 'active', 'pro'),

-- ITALIAN
('Il Mercato', 'il-mercato', 'Restaurante italiano com produtos importados de Itália. Pasta fresca, risotto e tiramisu caseiro.', 'Italiana', 'Lisboa', 'Rua Barata Salgueiro 28A, 1250-042 Lisboa', '+351 213 540 216', '€€', 50, 'active', 'pro'),

('Pizzeria Lisboa', 'pizzeria-lisboa', 'Pizza napolitana com forno a lenha. Massa de fermentação longa, ingredientes DOP e vinho italiano.', 'Italiana', 'Lisboa', 'Rua Actor Taborda 10, 1900-009 Lisboa', '+351 217 932 200', '€€', 60, 'active', 'free'),

('Osteria Romana', 'osteria-romana', 'Cozinha romana autêntica no Príncipe Real. Cacio e pepe, carbonara e saltimbocca alla romana.', 'Italiana', 'Lisboa', 'Rua da Escola Politécnica 45, 1250-101 Lisboa', '+351 213 422 850', '€€€', 40, 'active', 'pro'),

-- ASIAN
('Taberna dos Ferreiros', 'taberna-ferreiros', 'Fusão portuguesa-asiática no Intendente. Pratos criativos com influências de Goa e Macau.', 'Fusão', 'Lisboa', 'Rua dos Correeiros 68, 1100-163 Lisboa', '+351 213 425 211', '€€', 45, 'active', 'pro'),

('Tasca Japonesa', 'tasca-japonesa', 'Izakaya moderna em Lisboa. Ramen artesanal, gyoza frito e sake. Ambiente descontraído, menu de partilha.', 'Japonesa', 'Lisboa', 'Rua das Gaveas 82, 1200-206 Lisboa', '+351 213 470 426', '€€', 35, 'active', 'free'),

('Bao & Co', 'bao-and-co', 'Especialistas em bao (pão chinês ao vapor) com recheios contemporâneos. Dim sum e chá de origem.', 'Asiática', 'Lisboa', 'Rua Nova do Carvalho 36, 1200-292 Lisboa', '+351 910 234 567', '€', 30, 'active', 'free'),

-- STEAKHOUSE
('Páteo do Bispo', 'patio-do-bispo', 'Asador argentino no Castelo com pátio exterior. Costelas, picanha e chimichurri caseiro. Vinhos argentinos.', 'Grelhados', 'Lisboa', 'Largo Sta Luzia 5, 1100-487 Lisboa', '+351 218 822 041', '€€€', 60, 'active', 'pro'),

('Casa de Pasto do Bairro', 'casa-pasto-bairro', 'Casa de pasto tradicional no Bairro Alto. Bife na pedra, entrecosto e galinha à moda da casa.', 'Grelhados', 'Lisboa', 'Rua da Atalaia 38, 1200-043 Lisboa', '+351 213 465 811', '€€', 55, 'active', 'free'),

-- CONTEMPORARY
('Alma', 'alma', 'Restaurante de autor com estrela Michelin do Chef Henrique Sá Pessoa. Cozinha portuguesa contemporânea sofisticada.', 'Contemporânea', 'Lisboa', 'Rua Anchieta 15, 1200-023 Lisboa', '+351 213 470 650', '€€€€', 45, 'active', 'enterprise'),

('Fogo', 'fogo', 'Conceito baseado no fogo com ingredientes portugueses sazonais. Menu de degustação com harmonização de vinhos.', 'Contemporânea', 'Lisboa', 'Rua da Misericórdia 37-39, 1200-273 Lisboa', '+351 213 465 000', '€€€€', 30, 'active', 'enterprise'),

('O Corvo', 'o-corvo', 'Wine bar com cozinha natural no Intendente. Petiscos criativos, vinhos naturais portugueses e cerveja artesanal.', 'Contemporânea', 'Lisboa', 'Rua Jacinta Marto 118, 1150-179 Lisboa', '+351 213 532 282', '€€', 35, 'active', 'pro'),

-- VEGETARIAN / VEGAN
('Ao 26 Vegan Food Project', 'ao-26-vegan', 'Restaurante vegan premiado no Chiado. Menus degustação criativos sem produtos de origem animal. Conceito de fine dining vegan.', 'Vegan', 'Lisboa', 'Rua Victor Cordon 26, 1200-482 Lisboa', '+351 213 420 026', '€€€', 25, 'active', 'pro'),

('The Farm', 'the-farm', 'Restaurante vegetariano farm-to-table em Belém. Saladas, bowls e wraps com legumes da época.', 'Vegetariana', 'Lisboa', 'Rua Bartolomeu Dias 112, 1400-031 Lisboa', '+351 213 010 567', '€€', 40, 'active', 'free'),

-- NEIGHBOURHOOD GEMS
('Tasca da Esquina', 'tasca-da-esquina', 'Tasca moderna no Campo de Ourique. Petiscos criativos, tábua de queijos e enchidos portugueses. Ambiente informal.', 'Portuguesa', 'Lisboa', 'Rua Domingos Sequeira 41C, 1350-119 Lisboa', '+351 210 993 939', '€€', 45, 'active', 'pro'),

('Peixaria da Esquina', 'peixaria-da-esquina', 'Restaurante de peixe fresco do mercado diário. Carta simples e directa — o que chegou hoje do mar.', 'Marisco', 'Lisboa', 'Rua Domingos Sequeira 41, 1350-119 Lisboa', '+351 210 993 888', '€€', 40, 'active', 'pro'),

('Taberna Fina', 'taberna-fina', 'Taberna de vinhos naturais na Mouraria com petiscos de qualidade. Seleção de vinhos portugueses e espanhóis.', 'Portuguesa', 'Lisboa', 'Rua do Benformoso 98, 1100-078 Lisboa', '+351 218 853 878', '€€', 30, 'active', 'free'),

('O Nobre', 'o-nobre', 'Restaurante de cozinha portuguesa contemporânea em Arroios. Menu do dia acessível ao almoço, carta mais elaborada ao jantar.', 'Portuguesa', 'Lisboa', 'Rua Maria Andrade 12, 1170-209 Lisboa', '+351 213 141 016', '€€', 50, 'active', 'pro'),

('Pigmeu', 'pigmeu', 'Bar de cocktails e petiscos no Cais do Sodré. Cocktails de autor, bruschette e tábuas de snacks. Ambiente descontraído até tarde.', 'Petiscos', 'Lisboa', 'Rua da Boavista 96, 1200-088 Lisboa', '+351 213 423 780', '€€', 45, 'active', 'free'),

('Xico', 'xico', 'Tasca moderna nas Avenidas Novas. Cozinha caseira portuguesa com twist contemporâneo. Almoços de executivo e jantares.', 'Portuguesa', 'Lisboa', 'Rua Filipe Folque 22A, 1050-113 Lisboa', '+351 213 574 396', '€€', 55, 'active', 'pro');

-- Add default opening hours for all restaurants (Tue–Sun 12:00–15:00, 19:00–23:00)
INSERT INTO public.opening_hours (restaurant_id, day_of_week, open_time, close_time, is_closed)
SELECT r.id, d.day, '12:00'::TIME, '15:00'::TIME, (d.day = 1) -- Monday closed
FROM public.restaurants r
CROSS JOIN (VALUES (0),(1),(2),(3),(4),(5),(6)) AS d(day)
WHERE r.status = 'active';

INSERT INTO public.opening_hours (restaurant_id, day_of_week, open_time, close_time, is_closed)
SELECT r.id, d.day, '19:00'::TIME, '23:00'::TIME, (d.day = 1)
FROM public.restaurants r
CROSS JOIN (VALUES (0),(1),(2),(3),(4),(5),(6)) AS d(day)
WHERE r.status = 'active';
