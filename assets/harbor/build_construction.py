import bpy,math,os
from mathutils import Vector
root='D:/Github/Guns/assets/harbor';bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
materials={}
for name,col,metal in [('wood',(.33,.20,.095),0),('edge',(.19,.105,.045),0),('steel',(.12,.17,.15),.65),('bolt',(.45,.47,.36),.8)]:
 m=bpy.data.materials.new(name);m.diffuse_color=(*col,1);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*col,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=.62;materials[name]=m
parts=[]
def box(name,x,z,y,w,d,h,mat='wood'):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.name=name;o.scale=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(materials[mat]);b=o.modifiers.new('Soft timber edges','BEVEL');b.width=.015;b.segments=2;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');parts.append(o);return o
def export(kind,offset):
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.export_scene.gltf(filepath=root+'/build-'+kind+'.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True)
 for o in parts:o.location.x+=offset
 parts.clear()
for i in range(12):box('Vertical timber',-1.375+i*.25,0,1.05,.237,.18,2.1)
for y in [.25,1.7]:box('Cross brace',0,.13,y,3,.09,.14,'edge')
for x in [-1.35,1.35]:
 for y in [.25,1.7]:box('Iron nail',x,-.098,y,.06,.025,.06,'bolt')
export('wall',-4)
for i in range(12):box('Floor plank',-1.375+i*.25,0,1.43,.237,3,.14)
for x in [-1.25,1.25]:
 box('Floor support beam',x,0,1.26,.16,3,.22,'edge')
 for z in [-1.25,1.25]:box('Foundation post',x,z,.63,.16,.16,1.26,'edge');box('Steel foot',x,z,.07,.25,.25,.14,'steel')
export('floor',0)
for i in range(8):
 z=1.5-(i+.5)*3/8;h=(i+1)*1.5/8;box('Stair tread',0,z,h-.055,3,3/8-.012,.11)
 for x in [-1.3,1.3]:box('Step support',x,z,h/2,.15,.17,h,'edge')
export('stairs',4)
for i in range(7):box('Salvage timber',0,(i%3-.8)*.23,.09+(i//3)*.16,1.25,.19,.14,'wood')
for x in [-.35,.35]:box('Packing strap',x,0,.47,.065,.68,.025,'steel')
for i in range(3):box('Scrap plate',.86,.1,.08+i*.055,.38,.55,.05,'steel')
export('resources',8)
scene=bpy.context.scene;scene.world.color=(.22,.22,.22)
bpy.ops.object.light_add(type='AREA',location=(0,-5,9));bpy.context.object.data.energy=2100;bpy.context.object.data.size=9
bpy.ops.object.camera_add(location=(8,-13,11));c=bpy.context.object;c.rotation_euler=(Vector((1.5,0,.7))-c.location).to_track_quat('-Z','Y').to_euler();c.data.type='ORTHO';c.data.ortho_scale=16;scene.camera=c
scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True;scene.render.resolution_x=1400;scene.render.resolution_y=750;scene.render.resolution_percentage=100;scene.render.filepath=root+'/construction-review.png'
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
for d in prefs.devices:d.use=d.type=='OPTIX'
scene.cycles.device='GPU';bpy.ops.wm.save_as_mainfile(filepath=root+'/Construction.blend');bpy.ops.render.render(write_still=True)
