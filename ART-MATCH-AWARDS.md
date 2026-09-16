# Иллюстрации восьми достижений

Использован встроенный ImageGen в режиме редактирования. Для каждого достижения — отдельный запрос: исходный персонаж является целью редактирования, public/award-atlas-unique-characters.png служит только референсом стиля. Имена, условия и картинки скрыты в приложении до получения награды. Старые SVG-медали сохранены как предыдущая версия и больше не используются.

| Достижение | Персонаж | Финальный файл | Исходный кадр |
| --- | --- | --- | --- |
| А я ещё здесь | Многоликий Филипп | public/awards/still-here-zazerkalye.png | work/originals/603.webp |
| Скинул корону | Желейный Князь | public/awards/crown-off-zazerkalye.png | work/originals/589.webp |
| Без очереди | Братья Мишеневы | public/awards/no-queue-zazerkalye.png | work/originals/657.webp |
| До темноты | Большой Дима | public/awards/until-dark-zazerkalye.png | work/originals/738.webp |
| Должок вернул | Пахомий | public/awards/debt-paid-zazerkalye.png | work/originals/633.webp |
| Всех знает | Тётя Варя | public/awards/knows-everyone-zazerkalye.png | work/originals/632.webp |
| Местный житель | Истуканус | public/awards/local-resident-zazerkalye.png | work/originals/717.webp |
| Ноль — это начало | Жвачник | public/awards/zero-start-zazerkalye.png | work/originals/685.webp |

Источники кадров:

- https://zazerwiki.com/wp-content/uploads/2026/08/tri-golovy.webp
- https://zazerwiki.com/wp-content/uploads/2026/08/zheleinyi.webp
- https://zazerwiki.com/wp-content/uploads/2026/08/zhretsy.webp
- https://zazerwiki.com/wp-content/uploads/2026/08/belyi-velikan.webp
- https://zazerwiki.com/wp-content/uploads/2026/08/zelenyi-tolstyak.webp
- https://zazerwiki.com/wp-content/uploads/2026/08/vedma.webp
- https://zazerwiki.com/wp-content/uploads/2026/08/drevnii-strazh.webp
- https://zazerwiki.com/wp-content/uploads/2026/08/zuby-v-bolote.webp

Это фанатские адаптации персонажей под пинг-понг, созданные по исходным кадрам «Зазеркалья».

## Финальные задания исправления сетки

Для всех восьми изображений использован ракурс сбоку: длинная сторона стола слева направо, сетка соединяет середины длинных боковых сторон короткой линией в глубину изображения. Обе игровые половины видимы. У Пахомия одна попытка правки была отклонена фильтром генерации на стадии результата; успешный финальный вариант заново создан по исходному кадру в простой коричневой тунике.

### still-here

```text
Use case: precise-object-edit. Edit target: this generated Zazerkalye ping pong award scene. User correction: the table net is oriented incorrectly like a fence along the long side. Change ONLY the TABLE AND NET geometry, preserve the original recognisable character(s), face(s), exact costumes, achievement props (scoreboard or crown or five balls), forest background, low-poly PS1 pixelated style and palette. Redraw the table as ONE fully visible elongated regulation rectangular ping pong tabletop seen from an elevated SIDE three-quarter angle: its LONG dimension runs LEFT TO RIGHT on screen, playing short ends at LEFT and RIGHT, two equal square playing halves visibly side by side. NET must run FRONT TO BACK across the SHORT width at the exact longitudinal MIDPOINT, between the two long side-rails, thereby dividing LEFT HALF from RIGHT HALF. Thus in this side-view the net is a SHORT DIAGONAL segment at the CENTER of the tabletop receding toward the background, NOT a long horizontal fence from screen left to right, NOT on the near edge. Show both side-mounted net posts and clear equal tabletop area on BOTH sides of the net, with white perimeter lines. Full rectangular table should fit in bottom half of image, including BOTH short playing ends. Keep subjects upper half centred and recognisable. No added characters or text, preserve existing numeric scoreboard if present. Output one square raster illustration.
```

### crown-off

```text
Use case: precise-object-edit. Edit target: this generated Zazerkalye ping pong award scene. User correction: the table net is oriented incorrectly like a fence along the long side. Change ONLY the TABLE AND NET geometry, preserve the original recognisable character(s), face(s), exact costumes, achievement props (scoreboard or crown or five balls), forest background, low-poly PS1 pixelated style and palette. Redraw the table as ONE fully visible elongated regulation rectangular ping pong tabletop seen from an elevated SIDE three-quarter angle: its LONG dimension runs LEFT TO RIGHT on screen, playing short ends at LEFT and RIGHT, two equal square playing halves visibly side by side. NET must run FRONT TO BACK across the SHORT width at the exact longitudinal MIDPOINT, between the two long side-rails, thereby dividing LEFT HALF from RIGHT HALF. Thus in this side-view the net is a SHORT DIAGONAL segment at the CENTER of the tabletop receding toward the background, NOT a long horizontal fence from screen left to right, NOT on the near edge. Show both side-mounted net posts and clear equal tabletop area on BOTH sides of the net, with white perimeter lines. Full rectangular table should fit in bottom half of image, including BOTH short playing ends. Keep subjects upper half centred and recognisable. No added characters or text, preserve existing numeric scoreboard if present. Output one square raster illustration.
```

### no-queue

```text
Use case: precise-object-edit. Edit target: this generated Zazerkalye ping pong award scene. User correction: the table net is oriented incorrectly like a fence along the long side. Change ONLY the TABLE AND NET geometry, preserve the original recognisable character(s), face(s), exact costumes, achievement props (scoreboard or crown or five balls), forest background, low-poly PS1 pixelated style and palette. Redraw the table as ONE fully visible elongated regulation rectangular ping pong tabletop seen from an elevated SIDE three-quarter angle: its LONG dimension runs LEFT TO RIGHT on screen, playing short ends at LEFT and RIGHT, two equal square playing halves visibly side by side. NET must run FRONT TO BACK across the SHORT width at the exact longitudinal MIDPOINT, between the two long side-rails, thereby dividing LEFT HALF from RIGHT HALF. Thus in this side-view the net is a SHORT DIAGONAL segment at the CENTER of the tabletop receding toward the background, NOT a long horizontal fence from screen left to right, NOT on the near edge. Show both side-mounted net posts and clear equal tabletop area on BOTH sides of the net, with white perimeter lines. Full rectangular table should fit in bottom half of image, including BOTH short playing ends. Keep subjects upper half centred and recognisable. No added characters or text, preserve existing numeric scoreboard if present. Output one square raster illustration.
```

### until-dark

```text
Use case: precise-object-edit. Image 1 EDIT TARGET: existing generated Zazerkalye achievement. Image 2 TABLE GEOMETRY REFERENCE ONLY: correctly oriented ping pong table with a SHORT DIAGONAL net at the midpoint, two equal playing halves side by side. Change only target image 1's table and net geometry to match reference 2; do NOT import reference character or scoreboard. Preserve original target character identity, face, costume, background, red paddle, grainy PS1 low-poly textures and palette. Redraw ONE fully visible elongated rectangular tabletop with LONG axis LEFT TO RIGHT on screen, short playing ends at LEFT and RIGHT, equal square playing halves on either side. Net runs FRONT TO BACK across the SHORT width at exact longitudinal MIDPOINT between the two long side rails, so it appears as a SHORT DIAGONAL segment in the CENTRE, NOT as a long horizontal fence along near edge. Both side-mounted posts and both equal halves must be clearly visible. Table fits lower half, character stays upper half and recognisable. Preserve exact numeric scoreboard 16:14. No additional characters or text. One square raster illustration.
```

### debt-paid

```text
Use case: identity-preserve, compositing. Image 1 character reference: original canonical Пахомий from Zazerkalye meme, a funny friendly chunky lime-green forest creature, bulging round eyes, large triangular nose, crooked small smile. Image 2 table geometry reference ONLY: correct rectangular table and central short diagonal net. Produce ONE square achievement illustration for friendly ping pong club. Preserve Pakhomiy's recognisable original face and low-poly body proportions; dress him in a simple loose brown linen tunic covering his torso. Show him emerging from his familiar hollow tree, smiling and holding a red ping pong paddle after winning a rematch, one white ping pong ball and a chalk tally plank beside him. Mossy violet forest and weathered gold mirror. Table fully visible in lower half, long dimension LEFT TO RIGHT, two equal playing halves left and right, short net FRONT TO BACK at exact middle joining two long side-rails as a short central diagonal, following geometry of image2. No other characters from image2, no scoreboard from image2. Grainy PS1 low-poly 3D, pixelated painted textures, moss green, brown and muted gold palette matching existing award illustrations. No caption, text, logos, watermarks, violence or weapons. One single square illustration, no grid or medals.
```

### knows-everyone

```text
Use case: precise-object-edit. Image 1 EDIT TARGET: existing generated Zazerkalye achievement. Image 2 TABLE GEOMETRY REFERENCE ONLY: correctly oriented ping pong table with a SHORT DIAGONAL net at the midpoint, two equal playing halves side by side. Change only target image 1's table and net geometry to match reference 2; do NOT import reference character or scoreboard. Preserve original target character identity, face, costume, background, red paddle, grainy PS1 low-poly textures and palette. Redraw ONE fully visible elongated rectangular tabletop with LONG axis LEFT TO RIGHT on screen, short playing ends at LEFT and RIGHT, equal square playing halves on either side. Net runs FRONT TO BACK across the SHORT width at exact longitudinal MIDPOINT between the two long side rails, so it appears as a SHORT DIAGONAL segment in the CENTRE, NOT as a long horizontal fence along near edge. Both side-mounted posts and both equal halves must be clearly visible. Table fits lower half, character stays upper half and recognisable. Ensure exactly TEN small wooden paddle tokens are clearly present on table, in two neat rows of five, plus Aunt Varya's own held paddle; do not change her face, hair or costume. No additional characters or text. One square raster illustration.
```

### local-resident

```text
Use case: precise-object-edit. Image 1 EDIT TARGET: generated Zazerkalye achievement. Image 2 TABLE GEOMETRY REFERENCE ONLY: correctly oriented ping pong table. Change only image 1's TABLE AND NET to match reference image 2 geometry, do NOT import its character or props. Preserve target identity, face, costume, background, textures, grainy PS1 low-poly style. Redraw ONE fully visible elongated rectangular tabletop with LONG dimension LEFT TO RIGHT on screen, short playing ends at LEFT and RIGHT, two equal square playing halves on either side. Net must run FRONT TO BACK across the SHORT width at exact longitudinal MIDPOINT between two long side rails, so it appears as a SHORT DIAGONAL at the CENTRE, not a long horizontal fence along front or far edge. BOTH side-mounted posts and equal clear tabletop area on BOTH sides of net clearly visible. Table fits lower half with both playing ends visible, original character(s) upper half. Preserve the canonical stone idol with glowing purple eyes and giant nose, no added limbs, and the basket of balls. No extra characters, no added text. One square raster illustration.
```

### zero-start

```text
Use case: precise-object-edit. Image 1 EDIT TARGET: generated Zazerkalye achievement. Image 2 TABLE GEOMETRY REFERENCE ONLY: correctly oriented ping pong table. Change only image 1's TABLE AND NET to match reference image 2 geometry, do NOT import its character or props. Preserve target identity, face, costume, background, textures, grainy PS1 low-poly style. Redraw ONE fully visible elongated rectangular tabletop with LONG dimension LEFT TO RIGHT on screen, short playing ends at LEFT and RIGHT, two equal square playing halves on either side. Net must run FRONT TO BACK across the SHORT width at exact longitudinal MIDPOINT between two long side rails, so it appears as a SHORT DIAGONAL at the CENTRE, not a long horizontal fence along front or far edge. BOTH side-mounted posts and equal clear tabletop area on BOTH sides of net clearly visible. Table fits lower half with both playing ends visible, original character(s) upper half. Preserve exactly one canonical toothy white paper-bag Jvachnik, held red paddle and exact numeric physical scoreboard 2:1. No weapons. No extra characters, no added text. One square raster illustration.
```


## Исходные задания ImageGen

## still-here · Многоликий Филипп

```text
Use case: identity-preserve, compositing. Asset type: ONE square achievement illustration for the existing Zazerkalye ping-pong club website. Input image 1: EDIT TARGET, original canonical meme character Многоликий Филипп. Input image 2: STYLE REFERENCE ONLY, current 4x4 achievement atlas. Produce ONE single standalone square image, NOT an atlas, grid, collage, medal, icon or UI card. Preserve the exact peculiar THREE floating human masks on a thin branching wooden stick body, one grey stone face, one smiling dark-haired face, one white-moustached elderly face, recognisable from input 1. All THREE faces belong to ONE creature, not three people. Show him still standing ready with a red ping pong paddle beside a battered forest ping pong table after an improbable comeback. Tiny physical flip scoreboard shows exactly 3:2. Dreamlike purple forest, weathered golden mirror behind. Match the reference atlas: chunky grainy PS1-era low-poly 3D, pixelated painted textures, deliberately awkward meme faces, muted moss green, ivory, tarnished gold and purple, surreal Russian Zazerkalye forest. Keep character identities and physical shapes from the original frame, do not replace with generic fantasy characters. Mid-shot composition, faces and essential props within the central 65% of image so they survive a wide card crop, ping pong table and its physical MESH NET clearly visible in lower middle. No title, caption, subtitles, letters, logo or watermark. Remove any caption text from original. Output only the illustration.
```

## crown-off · Желейный Князь

```text
Use case: identity-preserve, compositing. Asset type: ONE square achievement illustration for the existing Zazerkalye ping-pong club website. Input image 1: EDIT TARGET, original canonical meme character Желейный Князь. Input image 2: STYLE REFERENCE ONLY, current 4x4 achievement atlas. Produce ONE single standalone square image, NOT an atlas, grid, collage, medal, icon or UI card. Preserve the recognisable translucent emerald-green jelly blob, angular crown-like pointed top, TWO protruding pearl eyeballs with black diamond pupils, no human face. At a mossy ping pong table, jelly tendril holds a red paddle, a small fallen tarnished golden crown lies on table to suggest defeating a stronger opponent. Forest meets a mossy stone tunnel and a weathered mirror. Keep original jelly creature silhouette. Match the reference atlas: chunky grainy PS1-era low-poly 3D, pixelated painted textures, deliberately awkward meme faces, muted moss green, ivory, tarnished gold and purple, surreal Russian Zazerkalye forest. Keep character identities and physical shapes from the original frame, do not replace with generic fantasy characters. Mid-shot composition, faces and essential props within the central 65% of image so they survive a wide card crop, ping pong table and its physical MESH NET clearly visible in lower middle. No title, caption, subtitles, letters, logo or watermark. Remove any caption text from original. Output only the illustration.
```

## no-queue · Братья Мишеневы

```text
Use case: identity-preserve, compositing. Asset type: ONE square achievement illustration for the existing Zazerkalye ping-pong club website. Input image 1: EDIT TARGET, original canonical meme character Братья Мишеневы. Input image 2: STYLE REFERENCE ONLY, current 4x4 achievement atlas. Produce ONE single standalone square image, NOT an atlas, grid, collage, medal, icon or UI card. Preserve exactly THREE canon brothers with long brown robes, pale green elongated MASK-like heads, black hollow oval mouth and eye openings, red concentric target markings on foreheads. Each has the same low-poly canonical form. Arrange at a forest ping pong table with one red paddle held forward, the others behind as an absurd victory procession. Exactly FIVE white ping pong balls neatly lined on the table. No spears or weapons; preserve their faces and costumes. Match the reference atlas: chunky grainy PS1-era low-poly 3D, pixelated painted textures, deliberately awkward meme faces, muted moss green, ivory, tarnished gold and purple, surreal Russian Zazerkalye forest. Keep character identities and physical shapes from the original frame, do not replace with generic fantasy characters. Mid-shot composition, faces and essential props within the central 65% of image so they survive a wide card crop, ping pong table and its physical MESH NET clearly visible in lower middle. No title, caption, subtitles, letters, logo or watermark. Remove any caption text from original. Output only the illustration.
```

## until-dark · Большой Дима

```text
Use case: identity-preserve, compositing. Asset type: ONE square achievement illustration for the existing Zazerkalye ping-pong club website. Input image 1: EDIT TARGET, original canonical meme character Большой Дима. Input image 2: STYLE REFERENCE ONLY, current 4x4 achievement atlas. Produce ONE single standalone square image, NOT an atlas, grid, collage, medal, icon or UI card. Preserve the original huge round white giant with massive arms, tiny melancholy face and small dark eyes, stubby seated legs; NOT a furry yeti redesign. Show him patiently waiting with red paddle at a small forest ping pong table in violet twilight, warm lantern lights. Physical flip scoreboard reads exactly 16:14. One white ping pong ball beside net. No red polyps from the reference, only Dima as the subject. Match the reference atlas: chunky grainy PS1-era low-poly 3D, pixelated painted textures, deliberately awkward meme faces, muted moss green, ivory, tarnished gold and purple, surreal Russian Zazerkalye forest. Keep character identities and physical shapes from the original frame, do not replace with generic fantasy characters. Mid-shot composition, faces and essential props within the central 65% of image so they survive a wide card crop, ping pong table and its physical MESH NET clearly visible in lower middle. No title, caption, subtitles, letters, logo or watermark. Remove any caption text from original. Output only the illustration.
```

## debt-paid · Пахомий

```text
Use case: identity-preserve, compositing. Asset type: ONE square achievement illustration for the existing Zazerkalye ping-pong club website. Input image 1: EDIT TARGET, original canonical meme character Пахомий. Input image 2: STYLE REFERENCE ONLY, current 4x4 achievement atlas. Produce ONE single standalone square image, NOT an atlas, grid, collage, medal, icon or UI card. Preserve the exact original chunky lime-green potbellied orc-like Pakhomiy, bulging mismatched white eyes, crooked teeth, triangular large nose, low-poly angular limbs. He leans from his recognisable hollow tree towards a mossy ping pong table, gripping a red paddle with stubborn victorious confidence. Three crossed-out chalk tally strokes on a small wood plank and a white ball hint at the debt finally paid. Keep only this creature; moss and weathered golden mirror behind. Match the reference atlas: chunky grainy PS1-era low-poly 3D, pixelated painted textures, deliberately awkward meme faces, muted moss green, ivory, tarnished gold and purple, surreal Russian Zazerkalye forest. Keep character identities and physical shapes from the original frame, do not replace with generic fantasy characters. Mid-shot composition, faces and essential props within the central 65% of image so they survive a wide card crop, ping pong table and its physical MESH NET clearly visible in lower middle. No title, caption, subtitles, letters, logo or watermark. Remove any caption text from original. Output only the illustration.
```

## knows-everyone · Тётя Варя

```text
Use case: identity-preserve, compositing. Asset type: ONE square achievement illustration for the existing Zazerkalye ping-pong club website. Input image 1: EDIT TARGET, original canonical meme character Тётя Варя. Input image 2: STYLE REFERENCE ONLY, current 4x4 achievement atlas. Produce ONE single standalone square image, NOT an atlas, grid, collage, medal, icon or UI card. Preserve canonical Aunt Varya's angular golden-tan face, black shoulder-length asymmetrical hair, strongly arched eyebrows, dark plum lips and violet eyelids; modest black sleeveless dress, no cleavage emphasis. She is a confident welcoming club host holding a red ping pong paddle beside a forest table. TEN distinct small worn wooden paddle tokens form a semicircle on table to hint at meeting ten rivals. Mossy stone pavilion with violet window and weathered gold mirror, no other characters. Match the reference atlas: chunky grainy PS1-era low-poly 3D, pixelated painted textures, deliberately awkward meme faces, muted moss green, ivory, tarnished gold and purple, surreal Russian Zazerkalye forest. Keep character identities and physical shapes from the original frame, do not replace with generic fantasy characters. Mid-shot composition, faces and essential props within the central 65% of image so they survive a wide card crop, ping pong table and its physical MESH NET clearly visible in lower middle. No title, caption, subtitles, letters, logo or watermark. Remove any caption text from original. Output only the illustration.
```

## local-resident · Истуканус

```text
Use case: identity-preserve, compositing. Asset type: ONE square achievement illustration for the existing Zazerkalye ping-pong club website. Input image 1: EDIT TARGET, original canonical meme character Истуканус. Input image 2: STYLE REFERENCE ONLY, current 4x4 achievement atlas. Produce ONE single standalone square image, NOT an atlas, grid, collage, medal, icon or UI card. Preserve the original massive moss-weathered angular stone idol face with deep square eye cavities glowing purple, enormous protruding long triangular stone nose and open angular mouth. He is immovably integrated into old forest temple ruins right behind a battered mossy ping pong table, a red paddle leaning against the stone base and a worn basket of many white balls. Everything suggests he has always lived beside this table. Do not invent arms or legs or a human body; no text. Match the reference atlas: chunky grainy PS1-era low-poly 3D, pixelated painted textures, deliberately awkward meme faces, muted moss green, ivory, tarnished gold and purple, surreal Russian Zazerkalye forest. Keep character identities and physical shapes from the original frame, do not replace with generic fantasy characters. Mid-shot composition, faces and essential props within the central 65% of image so they survive a wide card crop, ping pong table and its physical MESH NET clearly visible in lower middle. No title, caption, subtitles, letters, logo or watermark. Remove any caption text from original. Output only the illustration.
```

## zero-start · Жвачник

```text
Use case: identity-preserve, compositing. Asset type: ONE square achievement illustration for the existing Zazerkalye ping-pong club website. Input image 1: EDIT TARGET, original canonical meme character Жвачник. Input image 2: STYLE REFERENCE ONLY, current 4x4 achievement atlas. Produce ONE single standalone square image, NOT an atlas, grid, collage, medal, icon or UI card. Preserve ONE canonical Jvachnik from input 1: crumpled upright pale paper-bag-shaped creature, large dark oval mouth rimmed with crooked teeth. NO guns, no violence, no extra Jvachniki. Place him safely at the edge of a mossy swamp forest ping pong table, holding a red paddle with a folded paper corner; one white ping pong ball bounces by. Small physical flip scoreboard reads exactly 2:1, suggesting a win after a bad first set. Funny stubborn expression without redesigning the original bag creature. Match the reference atlas: chunky grainy PS1-era low-poly 3D, pixelated painted textures, deliberately awkward meme faces, muted moss green, ivory, tarnished gold and purple, surreal Russian Zazerkalye forest. Keep character identities and physical shapes from the original frame, do not replace with generic fantasy characters. Mid-shot composition, faces and essential props within the central 65% of image so they survive a wide card crop, ping pong table and its physical MESH NET clearly visible in lower middle. No title, caption, subtitles, letters, logo or watermark. Remove any caption text from original. Output only the illustration.
```
