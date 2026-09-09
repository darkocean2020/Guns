import bpy,math,os
from mathutils import Vector
root='D:/Github/Guns/assets/harbor'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
materials={}
for name,color,metal,rough in [('Olive shell',(.16,.21,.105),.35,.43),('Dark reinforcement',(.035,.055,.04),.4,.46),('Steel latch',(.42,.47,.39),.8,.3),('Stencil',(.82,.69,.36),.2,.56)]:
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;materials[name]=m
parts=[]
def box(name,loc,scale,mat,bevel=.025):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(materials[mat]);parts.append(o)
 if bevel:b=o.modifiers.new('Manufactured edge bevel','BEVEL');b.width=bevel;b.segments=3;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
box('Military supply case',(0,0,.33),(1.32,.88,.58),'Olive shell',.07)
box('Reinforced lid',(0,0,.66),(1.37,.93,.14),'Olive shell',.04)
box('Lid gasket',(0,0,.578),(1.35,.91,.025),'Dark reinforcement',.008)
for x in [-.53,.53]:
 box('Vertical reinforcement',(x,0,.38),(.09,.93,.65),'Dark reinforcement',.018)
 box('Top tie down band',(x,0,.744),(.09,.89,.025),'Dark reinforcement',.008)
 for y in [-.445,.445]:box('Corner armor',(x,y,.12),(.2,.09,.2),'Dark reinforcement')
for x in [-.30,.30]:
 box('Front latch plate',(x,-.477,.53),(.12,.025,.18),'Steel latch',.012)
 box('Latch clasp',(x,-.496,.52),(.075,.025,.095),'Dark reinforcement',.008)
 box('Rear hinge',(x,.477,.61),(.16,.045,.1),'Steel latch',.01)
for x in [-.688,.688]:
 box('Handle mount',(x,0,.43),(.035,.32,.14),'Dark reinforcement',.01)
 box('Carry handle',(x*1.04,0,.47),(.035,.22,.04),'Steel latch',.015)
box('ID plaque',(0,-.45,.33),(.48,.018,.16),'Dark reinforcement',.008)
box('Lid stencil plate',(0,0,.742),(.55,.35,.018),'Dark reinforcement',.008)
for i in range(4):box('Top stripe',(-.15+i*.1,.06,.756),(.045,.22,.008),'Stencil',.001)
bpy.ops.object.text_add(location=(0,-.465,.30),rotation=(math.pi/2,0,0));o=bpy.context.object;o.name='SUPPLY 04 stencil';o.data.body='SUPPLY 04';o.data.align_x='CENTER';o.data.size=.075;o.data.extrude=.0005;o.data.materials.append(materials['Stencil']);bpy.ops.object.convert(target='MESH');parts.append(bpy.context.object)
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.export_scene.gltf(filepath=root+'/military-crate.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True)
# Studio objects are added after export, so only the actual case is packaged.
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.location.z=-.02;floor.data.materials.append(materials['Dark reinforcement'])
scene=bpy.context.scene;scene.world.color=(.2,.2,.2)
for loc,power,size in [((1,-2,4),650,3),((-3,0,2),450,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.3))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(2.2,-3,2.6));o=bpy.context.object;o.rotation_euler=(Vector((0,0,.35))-o.location).to_track_quat('-Z','Y').to_euler();o.data.type='ORTHO';o.data.ortho_scale=2.5;scene.camera=o
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=900;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.filepath=root+'/military-crate-review.png'
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
for d in prefs.devices:d.use=d.type=='OPTIX'
scene.cycles.device='GPU'
bpy.ops.wm.save_as_mainfile(filepath=root+'/MilitaryCrate.blend');bpy.ops.render.render(write_still=True)
