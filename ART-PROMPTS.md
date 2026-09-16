# ImageGen prompts

Mode: built-in ImageGen. Sources and roles: ART-SOURCES.md.

## Initial composition brief

Use case: compositing, identity-preserve.
Asset type: one square 4x4 sprite atlas for 16 ping-pong achievement card illustrations, exactly 4 equal columns and 4 equal rows, edge-to-edge tiles, NO gutters, NO borders.
Input images 1 through 7 are ORIGINAL Zazerkalye video frames and character edit targets:
1 forest Bobyl, mottled pear/egg-shaped face-body with two thin legs and tiny glossy black eyes.
2 Patsanoid, bright green sphere with human face, two angular arms and feet.
3 Dusty Gleb, gold dusty low-poly human with small head, grey eyes.
4 Letopisny Artyom, pale egg-shaped face/body, ROUND WIRE SPECTACLES, two thin legs.
5 Sator Arepych, stern mustached imperial officer with tall fur hat and brown uniform.
6 Uncle Fantasmagor, angular pale human with big grin and white brimmed hat with black band.
7 Kolenyсh, pale pear-shaped walking creature with realistic eyes, pointed legs.
Preserve their actual original facial features, recognizable proportions, silhouette, clothing and grainy low polygon PS1 videogame textures. Do NOT replace them with cute cartoon creatures or realistic polished fantasy characters. Edit/composite these exact characters into ping-pong scenes, not loosely inspired substitutes. Backgrounds in original Zazerkalye aesthetic: pixelated forest, primitive wooden interiors, uncanny mirrored rooms, green grass, grey sky. Remove original video captions/watermark from card artwork. Keep each face large and recognizable in each tile; critical objects near tile center, useful crop for a wide card.
Tiles numbered 0-15 in row-major order:
ROW 1: 0 original Bobyl image1 beside small ping-pong table and red paddle; 1 original Patsanoid image2 holding red paddle, grassy pitch; 2 original Dusty Gleb image3 with ping-pong paddle in dusty column hall; 3 original Artyom image4, glasses, beside ping-pong scoreboard and open match record.
ROW 2: 4 original Sator image5 holding red paddle ready to serve in wooden hut; 5 original Artyom image4 in mushroom archive beside shelves of match records and ping-pong balls (archival achievement); 6 original Fantasmagor image6, same huge grin and brimmed hat, with trophy and table in eerie circus; 7 original Patsanoid image2 crouching UNDER a wooden ping-pong table with net, dejected.
ROW 3: 8 original Bobyl image1 beside empty ping-pong table, lost paddle on floor; 9 original Dusty Gleb image3 in slippers, forlorn beside table; 10 original Artyom image4 with glasses, overwhelmed by book of defeats and dropped paddle; 11 original Sator image5 with backwards-facing paddle and net tangled on table.
ROW 4: 12 original Fantasmagor image6, same grin and brimmed hat but forlorn with broken paddle in circus; 13 original Patsanoid image2 UNDER wooden ping-pong table, holding large banknote printed EXACTLY '50/50' clearly legible in dark ink across middle of note, hopeful; 14 original Bobyl image1 next to mirror reflection and ping-pong ball; 15 original Kolenyсh image7 next to ping-pong table, red paddle replacing wooden stick, three tiny defeated opponent paddles and tabletop score EXACTLY '3:0'.
Only in-image text allowed: '50/50' in tile13, '3:0' in tile15. NO tile labels, NO captions, NO titles, NO other text. Exactly16 independent cells, don't merge cells. Entire atlas is one coherent edited raster asset.

The first edit accepted five character frames (Bobyl, Patsanoid, Artyom, Sator, Fantasmagor); Dusty Gleb and Kolenych were added in the second edit because the tool accepts at most five input paths.

## Final edit

Use case: identity-preserve, compositing.
Edit target image1: existing square 4x4 ping-pong award atlas with exactly16cells, no gutters.
Supporting ORIGINAL video character images: image2 is original Dusty Gleb (golden dusty low-poly humanoid, small distinctive head and narrow grey eyes), image3 is original Kolenych (pale pear-shaped face/body with two pointed thin legs, large realistic eyes and long log pointing toward camera).
Make ONLY these changes:
- tile2 (row1 col3) replace grey faceless placeholder with EXACT original Dusty Gleb from image2 holding red ping-pong paddle. Preserve his face, head/body proportions, dusty gold/grainy textures. Keep hall and table.
- tile9 (row3 col2) replace grey placeholder with same EXACT original Dusty Gleb from image2, dejected, wearing slippers beside table.
- tile15 (row4 col4) replace grey placeholder with EXACT Kolenych from image3, keep pear face/body, pointed two legs, original face. Replace log with red ping-pong paddle, keep table and three tiny defeated red paddles, score '3:0'.
Preserve all other cells COMPLETELY unchanged: original Bobyl, Patsanoid, glasses-wearing Artyom, mustached uniformed Sator with fur hat, grinning Fantasmagor with white brimmed hat and black band. Preserve '50/50' on banknote row4 col2 exactly.
Retain original grainy PS1 low-poly aesthetic and forest/wooden/circus backgrounds. NO borders NO gutters, exactly4x4 equal tile geometry. Avoid cute/polished fantasy substitutes. Return entire edited atlas.

