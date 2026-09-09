"""Share identical embedded textures without changing geometry or image pixels."""
from pathlib import Path
import hashlib,json,struct
root=Path(__file__).resolve().parents[1]/'public';textures=root/'textures';textures.mkdir(exist_ok=True)
old_total=new_total=0
for path in root.rglob('*.glb'):
 data=path.read_bytes();old_total+=len(data);length=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+length]);binary=data[28+length:];image_views=set()
 for image in doc.get('images',[]):
  if 'bufferView' not in image:continue
  index=image['bufferView'];view=doc['bufferViews'][index];start=view.get('byteOffset',0);blob=binary[start:start+view['byteLength']];name=hashlib.sha256(blob).hexdigest()[:24]+('.png' if image['mimeType']=='image/png' else '.jpg');target=textures/name
  if target.exists():assert target.read_bytes()==blob
  else:target.write_bytes(blob)
  image_views.add(index);del image['bufferView'];image['uri']='../textures/'+name
 if not image_views:new_total+=len(data);continue
 for accessor in doc.get('accessors',[]):assert accessor.get('bufferView') not in image_views
 out=bytearray()
 for i,view in enumerate(doc['bufferViews']):
  start=view.get('byteOffset',0);chunk=b'\0'*4 if i in image_views else binary[start:start+view['byteLength']];view['byteOffset']=len(out);view['byteLength']=len(chunk);out.extend(chunk);out.extend(b'\0'*((-len(out))%4))
 doc['buffers'][0]['byteLength']=len(out);raw=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode();raw+=b' '*((-len(raw))%4);result=struct.pack('<III',0x46546c67,2,28+len(raw)+len(out))+struct.pack('<II',len(raw),0x4e4f534a)+raw+struct.pack('<II',len(out),0x004e4942)+out;path.write_bytes(result);new_total+=len(result)
print(f'GLB assets: {old_total/1048576:.1f} MB -> {new_total/1048576:.1f} MB; shared textures: {sum(p.stat().st_size for p in textures.iterdir())/1048576:.1f} MB')
