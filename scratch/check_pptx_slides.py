import zipfile
import re

with zipfile.ZipFile('scratch/batch4_before_output.pptx') as z:
    for name in sorted(z.namelist()):
        if name.startswith('ppt/slides/slide') and name.endswith('.xml'):
            print('===', name, '===')
            xml = z.read(name).decode('utf-8')
            for r in re.findall(r'<a:r>([\s\S]*?)</a:r>', xml):
                t = re.search(r'<a:t>([\s\S]*?)</a:t>', r)
                txt = t.group(1) if t else ''
                c = re.search(r'<a:srgbClr val="([A-Fa-f0-9]{6})"/>', r)
                clr = ('#' + c.group(1)) if c else 'NO_COLOR'
                print(f'  len={len(txt):3d} clr={clr} text={txt[:40]!r}')
