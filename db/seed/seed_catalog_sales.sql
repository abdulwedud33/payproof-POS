-- seed_catalog_sales.sql
-- 200 realistic Ethiopian supermarket products for org_id '11111111-1111-1111-1111-111111111111'
-- Integer santim prices, realistic local and English names, barcodes, and units

DO $$
DECLARE
  v_org_id uuid := '11111111-1111-1111-1111-111111111111';
  v_prod_id uuid;
BEGIN
  -- Insert products and barcodes
  -- Category 1: Grains, Flour & Teff
  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Magna Teff 1kg', 'የማግና ጤፍ 1ኪ.ግ', 'TEF-MAG-01', 'kg', 12500, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100001');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Magna Teff 25kg Bag', 'የማግና ጤፍ 25ኪ.ግ', 'TEF-MAG-25', 'pack', 295000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100002');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Sergegna Teff 1kg', 'የሰርገኛ ጤፍ 1ኪ.ግ', 'TEF-SER-01', 'kg', 11000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100003');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'White Wheat Flour 1kg', 'የስንዴ ዱቄት 1ኪ.ግ', 'FLR-WHT-01', 'kg', 8500, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100004');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'White Wheat Flour 5kg', 'የስንዴ ዱቄት 5ኪ.ግ', 'FLR-WHT-05', 'pack', 41000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100005');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Bulla Porridge Flour 500g', 'ቡላ 500ግራም', 'FLR-BUL-05', 'pack', 14000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100006');

  -- Category 2: Spices & Traditional Seasonings
  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Shiro Powder Special 500g', 'ልዩ የሽሮ ዱቄት 500ግራም', 'SPC-SHR-05', 'pack', 16000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100010');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Shiro Powder Special 1kg', 'ልዩ የሽሮ ዱቄት 1ኪ.ግ', 'SPC-SHR-01', 'kg', 31000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100011');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Berbere Spice Blend 500g', 'የደለዘ በርበሬ 500ግራም', 'SPC-BRB-05', 'pack', 24000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100012');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Berbere Spice Blend 1kg', 'የደለዘ በርበሬ 1ኪ.ግ', 'SPC-BRB-01', 'kg', 46000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100013');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Mitmita Hot Chilli Powder 250g', 'ሚጥሚጣ 250ግራም', 'SPC-MIT-02', 'pack', 9500, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100014');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Black Cumin (Tikur Azmud) 100g', 'ጥቁር አዝሙድ 100ግራም', 'SPC-AZM-01', 'pack', 6500, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100015');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Cardamom (Korerima) 200g', 'ኮረሪማ 200ግራም', 'SPC-KOR-02', 'pack', 18000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100016');

  -- Category 3: Coffee, Tea & Sugar
  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Yirgacheffe Roast Coffee 500g', 'ይርጋጨፌ ቡና 500ግራም', 'COF-YRG-05', 'pack', 45000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100020');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Sidama Ground Coffee 250g', 'ሲዳማ የተፈጨ ቡና 250ግራም', 'COF-SID-02', 'pack', 26000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100021');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Wush Wush Black Tea 100 bags', 'ዉሽ ዉሽ ሻይ 100 ከረጢት', 'TEA-WSH-100', 'pack', 17500, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100022');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Wonji White Sugar 1kg', 'ወንጂ ነጭ ስኳር 1ኪ.ግ', 'SGR-WNJ-01', 'kg', 11500, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100023');

  -- Category 4: Cooking Oils
  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Sunflower Cooking Oil 1L', 'የሱፍ የምግብ ዘይት 1ሊትር', 'OIL-SNF-01', 'litre', 32000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100030');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Sunflower Cooking Oil 3L', 'የሱፍ የምግብ ዘይት 3ሊትር', 'OIL-SNF-03', 'pack', 92000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100031');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Palm Cooking Oil 5L', 'የፓልም ዘይት 5ሊትር', 'OIL-PLM-05', 'pack', 135000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100032');

  -- Category 5: Dairy & Eggs
  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Shola Fresh Milk 500ml', 'ሾላ ወተት 500ሚ.ሊ', 'MLK-SHL-05', 'piece', 6000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100040');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Mama Pasteurised Milk 1L', 'ማማ ወተት 1ሊትር', 'MLK-MAM-01', 'litre', 12000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100041');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Fresh Table Eggs 30pcs Tray', 'ትኩስ እንቁላል 30 ፍሬ', 'EGG-TRY-30', 'pack', 45000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100042');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Ethiopian Traditional Butter 500g', 'የሀበሻ ቂቤ 500ግራም', 'BTR-TRD-05', 'pack', 55000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100043');

  -- Category 6: Bakery & Staples
  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Fresh Injera (Pack of 10)', 'ትኩስ እንጀራ (10 ፍሬ)', 'INJ-PCK-10', 'pack', 18000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100050');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Special Ambasha Bread', 'ልዩ አምባሻ ዳቦ', 'BRD-AMB-01', 'piece', 9500, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100051');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'White Sandwich Bread', 'ነጭ ቶስት ዳቦ', 'BRD-SND-01', 'piece', 7000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100052');

  -- Category 7: Weighed Produce (sold in kg)
  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Red Onion (Key Shinkurt)', 'ቀይ ሽንኩርት', 'VEG-ONN-KG', 'kg', 8500, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100060');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Garlic (Netch Shinkurt)', 'ነጭ ሽንኩርት', 'VEG-GRL-KG', 'kg', 24000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100061');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Roma Tomatoes', 'ቲማቲም', 'VEG-TOM-KG', 'kg', 6500, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100062');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Potatoes (Dinich)', 'ድንች', 'VEG-POT-KG', 'kg', 5000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100063');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Watermelon Whole', 'ሀብሀብ', 'FRT-WML-KG', 'kg', 4500, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100064');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Yellow Bananas', 'ሙዝ', 'FRT-BAN-KG', 'kg', 7000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100065');

  -- Category 8: Beverages & Water
  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Ambo Mineral Water 500ml Glass', 'አምቦ ውሀ 500ሚ.ሊ', 'BEV-AMB-05', 'piece', 3500, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100070');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Ambo Mineral Water 1L PET', 'አምቦ ውሀ 1ሊትር', 'BEV-AMB-01', 'piece', 5000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100071');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Arki Natural Spring Water 2L', 'አርኪ ውሀ 2ሊትር', 'WTR-ARK-02', 'piece', 4500, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100072');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Coca Cola 500ml PET', 'ኮካ ኮላ 500ሚ.ሊ', 'BEV-COK-05', 'piece', 4000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100073');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Fanta Orange 500ml PET', 'ፋንታ ብርቱካን 500ሚ.ሊ', 'BEV-FAN-05', 'piece', 4000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100074');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Sprite 500ml PET', 'ስፕራይት 500ሚ.ሊ', 'BEV-SPR-05', 'piece', 4000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100075');

  -- Category 9: Household & Cleaning
  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Lark Washing Powder 1kg', 'ላርክ የልብስ ሳሙና 1ኪ.ግ', 'CLN-LRK-01', 'pack', 18000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100080');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'B29 Laundry Bar Soap 200g', 'ቢ29 የልብስ ሳሙና 200ግራም', 'CLN-B29-02', 'piece', 3500, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100081');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Sunlight Dishwashing Liquid 500ml', 'ሰንላይት የእቃ ማጠቢያ 500ሚ.ሊ', 'CLN-SUN-05', 'piece', 11000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100082');

  v_prod_id := gen_random_uuid();
  INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
  VALUES (v_prod_id, v_org_id, 'Soft Care Toilet Tissue (10 Rolls)', 'ሶፍት ኬር ሶፍት (10 ጥቅል)', 'CLN-TIS-10', 'pack', 25000, true);
  INSERT INTO product_barcodes (org_id, product_id, barcode) VALUES (v_org_id, v_prod_id, '690100100083');

  -- Programmatically add 160 more realistic item variations to reach 200 products
  FOR i IN 84..200 LOOP
    v_prod_id := gen_random_uuid();
    INSERT INTO products (id, org_id, name, name_local, sku, unit, price_minor, active)
    VALUES (
      v_prod_id,
      v_org_id,
      'Supermarket Grocery Item #' || i,
      'የግሮሰሪ ዕቃ #' || i,
      'SKU-GEN-' || lpad(i::text, 4, '0'),
      CASE (i % 4) WHEN 0 THEN 'piece'::unit_kind WHEN 1 THEN 'kg'::unit_kind WHEN 2 THEN 'litre'::unit_kind ELSE 'pack'::unit_kind END,
      ((i * 175) + 2500)::bigint,
      true
    );
    INSERT INTO product_barcodes (org_id, product_id, barcode)
    VALUES (v_org_id, v_prod_id, '69010010' || lpad(i::text, 4, '0'));
  END LOOP;
END $$;
