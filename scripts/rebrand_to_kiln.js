const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RECON = path.join(ROOT, 'recon');
const GUIDES_DIR = path.join(RECON, 'guides');

function updateFile(filePath, transformFn) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const original = fs.readFileSync(filePath, 'utf8');
  const updated = transformFn(original);
  if (original !== updated) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`Updated: ${path.relative(ROOT, filePath)}`);
  }
}

function transformHtml(html, lang = 'en') {
  let res = html;

  // Title, Meta, OpenGraph
  res = res
    .replace(/<title>Filee \|/g, '<title>Kiln |')
    .replace(/\| Filee<\/title>/g, '| Kiln</title>')
    .replace(/\| Filee 文件转换器<\/title>/g, '| Kiln 文件转换器</title>')
    .replace(/<title>Filee 命令行/g, '<title>Kiln 命令行')
    .replace(/<title>Filee 명령줄/g, '<title>Kiln 명령줄')
    .replace(/<title>支持的文件格式一览：244 种格式 \| Filee 文件转换器<\/title>/g, '<title>支持的文件格式一览：244 种格式 | Kiln 文件转换器</title>')
    .replace(/<meta property="og:site_name" content="Filee">/g, '<meta property="og:site_name" content="Kiln">')
    .replace(/content="Filee \|/g, 'content="Kiln |')
    .replace(/\| Filee"/g, '| Kiln"')
    .replace(/\| Filee 文件转换器"/g, '| Kiln 文件转换器"')
    .replace(/content="Filee 命令行/g, 'content="Kiln 命令行')
    .replace(/content="Filee 명령줄/g, 'content="Kiln 명령줄')
    .replace(/content="Filee is a client-side/g, 'content="Kiln is a client-side')
    .replace(/content="Filee는/g, 'content="Kiln은')
    .replace(/content="Filee가/g, 'content="Kiln이')
    .replace(/content="Filee 是一款/g, 'content="Kiln 是一款')
    .replace(/content="Filee 支持/g, 'content="Kiln 支持')
    .replace(/content="在 Windows 上用免费的 filee 命令/g, 'content="在 Windows 上用免费的 kiln 命令')
    .replace(/content="All 244 formats Filee converts/g, 'content="All 244 formats Kiln converts')
    .replace(/content="Filee: a donut of formats opens at the cursor while dragging a file"/g, 'content="Kiln: a donut of formats opens at the cursor while dragging a file"')
    .replace(/content="Filee: 파일을 끌면 커서 위치에 변환 형식 도넛이 열립니다"/g, 'content="Kiln: 파일을 끌면 커서 위치에 변환 형식 도넛이 열립니다"')
    .replace(/content="Filee：拖动文件时，光标处会弹出格式圆环"/g, 'content="Kiln：拖动文件时，光标处会弹出格式圆环"')
    .replace(/alt="Filee: a donut of formats opens at the cursor while dragging a file"/g, 'alt="Kiln: a donut of formats opens at the cursor while dragging a file"')
    .replace(/alt="Filee: 파일을 끌면 커서 위치에 변환 형식 도넛이 열립니다"/g, 'alt="Kiln: 파일을 끌면 커서 위치에 변환 형식 도넛이 열립니다"')
    .replace(/alt="Filee：拖动文件时，光标处会弹出格式圆环"/g, 'alt="Kiln：拖动文件时，光标处会弹出格式圆环"')
    .replace(/Filee installer/g, 'Kiln installer')
    .replace(/"filee" command/g, '"kiln" command')
    .replace(/that Filee knows/g, 'that Kiln knows')
    .replace(/while Filee runs/g, 'while Kiln runs')
    .replace(/expanded by filee itself/g, 'expanded by kiln itself')
    .replace(/&quot;filee&quot; 명령어를/g, '&quot;kiln&quot; 명령어를')
    .replace(/모두 Filee 폴더/g, '모두 Kiln 폴더')
    .replace(/alt="Filee: /g, 'alt="Kiln: ')
    .replace(/alt="Filee：/g, 'alt="Kiln：')
    .replace(/alt="Filee on AlternativeTo"/g, 'alt="Kiln on AlternativeTo"')
    .replace(/aria-label="Filee"/g, 'aria-label="Kiln"')
    .replace(/<span>Filee<\/span>/g, '<span>Kiln</span>')
    .replace(/<div><strong>Filee<\/strong><p>/g, '<div><strong>Kiln</strong><p>')
    .replace(/<strong>Filee<\/strong>/g, '<strong>Kiln</strong>')
    .replace(/Sponsor Filee/g, 'Sponsor Kiln')
    .replace(/Filee 후원하기/g, 'Kiln 후원하기')
    .replace(/赞助 Filee/g, '赞助 Kiln')
    .replace(/"name":\s*"Filee"/g, '"name": "Kiln"')
    .replace(/"name":"Filee 命令行/g, '"name":"Kiln 命令行')
    .replace(/"name":"Filee 명령줄/g, '"name":"Kiln 명령줄')
    .replace(/"dependencies":"Filee 1\.11\.0/g, '"dependencies":"Kiln 1.11.0')
    .replace(/"headline":"filee 命令行/g, '"headline":"kiln 命令行')
    .replace(/"headline":"filee 명령/g, '"headline":"kiln 명령')
    .replace(/"headline":"The filee command line"/g, '"headline":"The kiln command line"');

  // English content replacements
  res = res
    .replace(/FILEE<span style="color:#e5322d;">\.<\/span>/g, 'KILN<span style="color:#e5322d;">.</span>')
    .replace(/Filee<span style="color:#e5322d;">\.<\/span>/g, 'Kiln<span style="color:#e5322d;">.</span>')
    .replace(/FILEE PLATFORM/g, 'KILN PLATFORM')
    .replace(/&copy; Filee Platform/g, '&copy; Kiln Platform')
    .replace(/&copy; Filee 플랫폼/g, '&copy; Kiln 플랫폼')
    .replace(/&copy; Filee 平台/g, '&copy; Kiln 平台')
    .replace(/\[FILEE ENGINE\]/g, '[KILN ENGINE]')
    .replace(/<th>Filee \(Air-Gapped Client Engine\)<\/th>/g, '<th>Kiln (Air-Gapped Client Engine)</th>')
    .replace(/in Filee's format donut/g, "in Kiln's format donut")
    .replace(/Filee's format donut/g, "Kiln's format donut")
    .replace(/Filee's own folder/g, "Kiln's own folder")
    .replace(/Filee's own HWPX writer/g, "Kiln's own HWPX writer")
    .replace(/Filee's own writer/g, "Kiln's own writer")
    .replace(/Filee's offline/g, "Kiln's offline")
    .replace(/Filee's engine/g, "Kiln's engine")
    .replace(/Filee's/g, "Kiln's")
    .replace(/inside Filee/g, 'inside Kiln')
    .replace(/inside Filee\)/g, 'inside Kiln)')
    .replace(/Filee downloads/g, 'Kiln downloads')
    .replace(/Filee uses/g, 'Kiln uses')
    .replace(/Filee converts/g, 'Kiln converts')
    .replace(/Filee reads/g, 'Kiln reads')
    .replace(/Filee writes/g, 'Kiln writes')
    .replace(/Filee turns/g, 'Kiln turns')
    .replace(/Filee renders/g, 'Kiln renders')
    .replace(/Filee takes/g, 'Kiln takes')
    .replace(/Filee goes/g, 'Kiln goes')
    .replace(/Filee recognises/g, 'Kiln recognises')
    .replace(/Filee detects/g, 'Kiln detects')
    .replace(/Filee executes/g, 'Kiln executes')
    .replace(/Filee analyzes/g, 'Kiln analyzes')
    .replace(/Filee generates/g, 'Kiln generates')
    .replace(/Filee offers/g, 'Kiln offers')
    .replace(/Filee will/g, 'Kiln will')
    .replace(/Filee can/g, 'Kiln can')
    .replace(/Filee is/g, 'Kiln is')
    .replace(/Filee does/g, 'Kiln does')
    .replace(/Filee has/g, 'Kiln has')
    .replace(/Filee regularly/g, 'Kiln regularly')
    .replace(/Filee automatically/g, 'Kiln automatically')
    .replace(/\(Filee lays/g, '(Kiln lays')
    .replace(/so Filee only/g, 'so Kiln only')
    .replace(/installing Filee/g, 'installing Kiln')
    .replace(/installed Filee/g, 'installed Kiln')
    .replace(/set in Filee/g, 'set in Kiln')
    .replace(/Convert with Filee/g, 'Convert with Kiln')
    .replace(/How does Filee/g, 'How does Kiln')
    .replace(/Is Filee/g, 'Is Kiln')
    .replace(/Because Filee/g, 'Because Kiln')
    .replace(/Does Filee/g, 'Does Kiln')
    .replace(/size Filee can/g, 'size Kiln can')
    .replace(/to Filee\./g, 'to Kiln.')
    .replace(/to Filee /g, 'to Kiln ')
    .replace(/in Filee\./g, 'in Kiln.')
    .replace(/in Filee /g, 'in Kiln ')
    .replace(/Filee HWPX/g, 'Kiln HWPX')
    .replace(/in the Filee installer/g, 'in the Kiln installer')
    .replace(/add the &quot;filee&quot; command to PATH/g, 'add the &quot;kiln&quot; command to PATH')
    .replace(/in the Filee folder/g, 'in the Kiln folder')
    .replace(/running the Filee app/g, 'running the Kiln app')
    .replace(/files Filee recognizes/g, 'files Kiln recognizes')
    .replace(/formats Filee doesn't recognize/g, "formats Kiln doesn't recognize")
    .replace(/created or changed in Filee/g, 'created or changed in Kiln')
    .replace(/wildcards are expanded by filee itself/g, 'wildcards are expanded by kiln itself')
    .replace(/The filee command line/g, 'The kiln command line')
    .replace(/the filee command/g, 'the kiln command')
    .replace(/The filee command/g, 'The kiln command')
    .replace(/filee-cli\.exe/g, 'kiln-cli.exe')
    .replace(/filee convert/g, 'kiln convert')
    .replace(/filee watch/g, 'kiln watch')
    .replace(/filee formats/g, 'kiln formats')
    .replace(/filee presets/g, 'kiln presets')
    .replace(/filee help/g, 'kiln help')
    .replace(/filee version/g, 'kiln version');

  // Korean grammar & text replacements
  res = res
    .replace(/Filee는/g, 'Kiln은')
    .replace(/Filee은/g, 'Kiln은')
    .replace(/Filee가/g, 'Kiln이')
    .replace(/Filee이/g, 'Kiln이')
    .replace(/Filee를/g, 'Kiln을')
    .replace(/Filee을/g, 'Kiln을')
    .replace(/Filee의/g, 'Kiln의')
    .replace(/Filee에서/g, 'Kiln에서')
    .replace(/Filee만/g, 'Kiln만')
    .replace(/Filee 안에서/g, 'Kiln 안에서')
    .replace(/Filee 자체 폴더/g, 'Kiln 자체 폴더')
    .replace(/Filee 전용 폴더/g, 'Kiln 전용 폴더')
    .replace(/Filee 내부/g, 'Kiln 내부')
    .replace(/Filee 도넛/g, 'Kiln 도넛')
    .replace(/Filee만 설치하면/g, 'Kiln만 설치하면')
    .replace(/Filee 설치 프로그램/g, 'Kiln 설치 프로그램')
    .replace(/&quot;filee&quot; 명령을 PATH에 추가/g, '&quot;kiln&quot; 명령을 PATH에 추가')
    .replace(/Filee 폴더 안에/g, 'Kiln 폴더 안에')
    .replace(/Filee 앱을 실행/g, 'Kiln 앱을 실행')
    .replace(/Filee가 아는 파일/g, 'Kiln이 아는 파일')
    .replace(/Filee가 모르는 형식/g, 'Kiln이 모르는 형식')
    .replace(/와일드카드는 filee가 직접/g, '와일드카드는 kiln이 직접')
    .replace(/Filee와/g, 'Kiln과')
    .replace(/<h1>filee 명령줄/g, '<h1>kiln 명령줄')
    .replace(/<h2>filee 명령 설정/g, '<h2>kiln 명령 설정')
    .replace(/filee 명령줄/g, 'kiln 명령줄')
    .replace(/filee 명령/g, 'kiln 명령')
    .replace(/Filee 플랫폼/g, 'Kiln 플랫폼');

  // Chinese grammar & text replacements
  res = res
    .replace(/在 Filee 的格式圆环中/g, '在 Kiln 的格式圆环中')
    .replace(/在 Filee 的格式圆环/g, '在 Kiln 的格式圆环')
    .replace(/在 Filee 中设置的按键/g, '在 Kiln 中设置的按键')
    .replace(/在 Filee 中设置/g, '在 Kiln 中设置')
    .replace(/使用 Filee 转换/g, '使用 Kiln 转换')
    .replace(/只需安装 Filee/g, '只需安装 Kiln')
    .replace(/安装 Filee 即可/g, '安装 Kiln 即可')
    .replace(/在 Filee 内/g, '在 Kiln 内')
    .replace(/保存在 Filee 自身文件夹/g, '保存在 Kiln 自身文件夹')
    .replace(/保存在 Filee 自己的文件夹/g, '保存在 Kiln 自己的文件夹')
    .replace(/保存在 Filee 自身/g, '保存在 Kiln 自身')
    .replace(/Filee 会/g, 'Kiln 会')
    .replace(/Filee 为/g, 'Kiln 为')
    .replace(/Filee 的/g, 'Kiln 的')
    .replace(/在 Filee 安装程序/g, '在 Kiln 安装程序')
    .replace(/将 &quot;filee&quot; 命令添加到 PATH/g, '将 &quot;kiln&quot; 命令添加到 PATH')
    .replace(/都在 Filee 文件夹中/g, '都在 Kiln 文件夹中')
    .replace(/无需运行 Filee 应用/g, '无需运行 Kiln 应用')
    .replace(/Filee 不认识/g, 'Kiln 不认识')
    .replace(/Filee 认识/g, 'Kiln 认识')
    .replace(/在 Filee 中创建或修改/g, '在 Kiln 中创建或修改')
    .replace(/通配符由 filee 自己展开/g, '通配符由 kiln 自己展开')
    .replace(/Filee 支持/g, 'Kiln 支持')
    .replace(/Filee 是一款/g, 'Kiln 是一款')
    .replace(/Filee 在托盘中运行/g, 'Kiln 在托盘中运行')
    .replace(/<h1>filee 命令行/g, '<h1>kiln 命令行')
    .replace(/<h2>配置 filee 命令/g, '<h2>配置 kiln 命令')
    .replace(/<h2>设置 filee 命令/g, '<h2>设置 kiln 命令')
    .replace(/filee 命令行/g, 'kiln 命令行')
    .replace(/filee 命令/g, 'kiln 命令')
    .replace(/Filee 平台/g, 'Kiln 平台');

  return res;
}

// 1. Process all HTML files in recon/
console.log('--- Processing All HTML Files in recon/ ---');
const reconFiles = fs.readdirSync(RECON).filter(f => f.endsWith('.html'));
for (const f of reconFiles) {
  const full = path.join(RECON, f);
  const lang = f.includes('-ko.') || f.includes('.ko.') ? 'ko' : (f.includes('-zh.') || f.includes('.zh-CN.') ? 'zh' : 'en');
  updateFile(full, c => transformHtml(c, lang));
}

// 2. Process all guide files in recon/guides/
console.log('--- Processing All HTML Guides in recon/guides/ ---');
const guideFiles = fs.readdirSync(GUIDES_DIR).filter(f => f.endsWith('.html'));
for (const f of guideFiles) {
  const full = path.join(GUIDES_DIR, f);
  const lang = f.includes('.ko.') ? 'ko' : (f.includes('.zh-CN.') ? 'zh' : 'en');
  updateFile(full, c => transformHtml(c, lang));
}

// 3. Process src/data/guides.json
console.log('--- Processing src/data/guides.json ---');
updateFile(path.join(ROOT, 'src/data/guides.json'), content => {
  let res = content;
  res = res
    .replace(/\| Filee/g, '| Kiln')
    .replace(/in Filee's format donut/g, "in Kiln's format donut")
    .replace(/Filee's format donut/g, "Kiln's format donut")
    .replace(/Filee's/g, "Kiln's")
    .replace(/set in Filee\)/g, 'set in Kiln)')
    .replace(/set in Filee/g, 'set in Kiln')
    .replace(/Convert with Filee/g, 'Convert with Kiln')
    .replace(/What Filee does for/g, 'What Kiln does for')
    .replace(/What Filee does/g, 'What Kiln does')
    .replace(/installing Filee/g, 'installing Kiln')
    .replace(/installed Filee/g, 'installed Kiln')
    .replace(/"name":\s*"Filee"/g, '"name": "Kiln"')
    .replace(/Filee uses/g, 'Kiln uses')
    .replace(/Filee converts/g, 'Kiln converts')
    .replace(/Filee turns/g, 'Kiln turns')
    .replace(/Filee reads/g, 'Kiln reads')
    .replace(/Filee writes/g, 'Kiln writes')
    .replace(/Filee renders/g, 'Kiln renders')
    .replace(/Filee takes/g, 'Kiln takes')
    .replace(/Filee goes/g, 'Kiln goes')
    .replace(/Filee recognises/g, 'Kiln recognises')
    .replace(/Filee detects/g, 'Kiln detects')
    .replace(/Filee offers/g, 'Kiln offers')
    .replace(/\(Filee lays/g, '(Kiln lays')
    .replace(/so Filee only/g, 'so Kiln only')
    .replace(/Filee는/g, 'Kiln은')
    .replace(/Filee가/g, 'Kiln이')
    .replace(/Filee를/g, 'Kiln을')
    .replace(/Filee의/g, 'Kiln의')
    .replace(/Filee에서/g, 'Kiln에서')
    .replace(/Filee만/g, 'Kiln만')
    .replace(/Filee 자체/g, 'Kiln 자체')
    .replace(/Filee 내부/g, 'Kiln 내부')
    .replace(/在 Filee 的格式圆环中/g, '在 Kiln 的格式圆环中')
    .replace(/在 Filee 的格式圆环/g, '在 Kiln 的格式圆环')
    .replace(/在 Filee 中设置的按键/g, '在 Kiln 中设置的按键')
    .replace(/使用 Filee 转换/g, '使用 Kiln 转换')
    .replace(/只需安装 Filee/g, '只需安装 Kiln')
    .replace(/安装 Filee 即可/g, '安装 Kiln 即可')
    .replace(/在 Filee 内/g, '在 Kiln 内')
    .replace(/保存在 Filee 自身/g, '保存在 Kiln 自身')
    .replace(/Filee 会/g, 'Kiln 会')
    .replace(/Filee 为/g, 'Kiln 为')
    .replace(/Filee 的/g, 'Kiln 的');
  return res;
});

console.log('=== All Comprehensive Replacements Complete ===');
