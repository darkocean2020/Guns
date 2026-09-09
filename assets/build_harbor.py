"""Original Tokyo-port-inspired game environment and bird characters, built in Blender."""
import bpy, math, json, os
from mathutils import Vector
ROOT='D:/Github/Guns/assets/harbor';os.makedirs(ROOT,exist_ok=True)
scene=bpy.data.scenes.new('TOKYO HARBOR — extraction district');bpy.context.window.scene=scene
materials={};parts=[];colliders=[];loot=[]
palette={'asphalt':(.065,.085,.091),'concrete':(.28,.32,.32),'steel':(.13,.18,.20),'rust':(.40,.18,.095),'red':(.48,.13,.10),'teal':(.075,.29,.29),'blue':(.12,.24,.34),'cream':(.59,.55,.39),'yellow':(.86,.50,.10),'white':(.72,.78,.73),'rubber':(.024,.03,.032),'wood':(.28,.17,.08),'glass':(.12,.43,.46),'orange':(.94,.26,.04),'feather':(.78,.79,.69),'vest':(.13,.20,.18),'enemy':(.45,.20,.13),'light':(1,.62,.20)}
for name,col in palette.items():
    m=bpy.data.materials.new('harbor_'+name);m.diffuse_color=(*col,1);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*col,1);bs.inputs['Roughness'].default_value=.42 if name in ['asphalt','steel','teal','blue','red'] else .72;bs.inputs['Metallic'].default_value=.6 if name in ['steel','rust'] else .18 if name in ['teal','red','blue'] else 0
    if name in ['light','glass']:bs.inputs['Emission Color'].default_value=(*col,1);bs.inputs['Emission Strength'].default_value=2 if name=='light' else .35
    materials[name]=m
def pos(x,z,y):return (x,-z,y)
def finish(o,name,mat,bevel=0):
    o.name=name;o.data.materials.append(materials[mat]);parts.append(o)
    if bevel:
        b=o.modifiers.new('Rounded manufactured edges','BEVEL');b.width=bevel;b.segments=3;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o
def box(name,x,z,y,w,d,h,mat='steel',bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos(x,z,y));o=bpy.context.object;o.scale=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,mat,bevel)
def cyl(name,x,z,y,r,h,mat='steel',axis='Y',vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=pos(x,z,y));o=bpy.context.object
    if axis=='X':o.rotation_euler[1]=math.pi/2
    if axis=='Z':o.rotation_euler[0]=math.pi/2
    for p in o.data.polygons:p.use_smooth=True
    return finish(o,name,mat,.018)
def sphere(name,x,z,y,scale,mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=pos(x,z,y));o=bpy.context.object;o.scale=scale
    for p in o.data.polygons:p.use_smooth=True
    return finish(o,name,mat)
def beam(name,a,b,width,mat='steel'):
    a,b=Vector(pos(*a)),Vector(pos(*b));mid=(a+b)/2;o=box(name,mid.x,-mid.y,mid.z,width,width,(b-a).length,mat,.025);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
font=None
for path in ['C:/Windows/Fonts/meiryo.ttc','C:/Windows/Fonts/msgothic.ttc']:
    if os.path.isfile(path):
        try:font=bpy.data.fonts.load(path);break
        except:pass
def text(name,x,z,y,size,mat='white',ground=False):
    c=bpy.data.curves.new(name,'FONT');c.body=name;c.align_x='CENTER';c.size=size;c.extrude=.001
    if font:c.font=font
    o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);o.location=pos(x,z,y)
    if not ground:o.rotation_euler=(math.pi/2,0,0)
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return finish(bpy.context.object,name,mat)
def solid(name,x,z,w,d,h=2):colliders.append({'name':name,'x':x,'z':z,'w':w,'d':d,'h':h})
def container(x,z,color='teal',stack=1,label='TOKYO FREIGHT'):
    w,d,h=7.6,3,2.65
    solid('container',x,z,w,d,h*stack)
    for layer in range(stack):
        y=.14+h/2+layer*h;box('Container body',x,z,y,w,d,h,color,.10)
        for side in [-1,1]:
            for i in range(26):box('Corrugated wall',x-w/2+.18+i*.289,z+side*(d/2+.025),y,.070,.048,h-.19,color,.012)
            for yy in [y-h/2+.09,y+h/2-.09]:box('Container rail',x,z+side*d/2,yy,w,.10,.12,'steel',.02)
        for i in range(26):box('Roof seam',x-w/2+.16+i*.29,z,y+h/2+.012,.038,d-.08,.025,color,.006)
        for sx in [-1,1]:
            for sz in [-1,1]:box('Corner casting',x+sx*(w/2-.08),z+sz*(d/2-.07),y,.17,.17,h+.03,'steel',.025)
        for dz in [-.70,.70]:
            box('Double container door',x+w/2+.025,z+dz,y,.06,1.35,h-.15,color,.025)
            for latch in [-.38,.38]:cyl('Door locking rod',x+w/2+.07,z+dz+latch,y,.035,h-.32,'steel')
        if layer==0:text(label,x,z+1.533,y+.2,.38,'white')
        for xx in [-3.3,3.3]:box('Container corner label',x+xx,z+1.539,y-.85,.17,.018,.20,'yellow',.002)
def wall(name,x,z,w,d,h=2.1):box(name,x,z,h/2,w,d,h,'concrete',.06);solid(name,x,z,w,d,h)
def warehouse(x,z,w,d,name):
    box('Warehouse floor',x,z,.055,w,d,.12,'concrete')
    wall('Warehouse north',x,z-d/2,w,.35)
    wall('Warehouse west',x-w/2,z,.35,d)
    wall('Warehouse east',x+w/2,z,.35,d)
    for sign in [-1,1]:wall('Door wing',x+sign*(w/4+1),z+d/2,w/2-2,.35)
    for px in [-w/2,w/2]:
        for pz in [-d/2,d/2]:box('Building column',x+px,z+pz,1.35,.44,.44,2.7,'steel')
    box('Door lintel',x,z+d/2,2.55,4.3,.40,.32,'steel');box('Door sign',x,z+d/2+.23,2.55,3.1,.055,.56,'blue');text(name,x,z+d/2+.27,2.4,.32)
    for j in range(2):
        sx=x-w/2+2+j*3.4;sz=z-d/2+2
        box('Warehouse shelf',sx,sz,1.05,2.1,.9,1.8,'steel');solid('shelf',sx,sz,2.1,.9,1.8)
        for yy in [.4,1.1,1.7]:
            box('Shelf deck',sx,sz,yy,2.2,.95,.08,'cream')
            for a in [-.65,0,.65]:box('Supply carton',sx+a,sz,yy+.22,.51,.67,.40,'wood',.045)
    for side in [-1,1]:box('Window light',x+side*w/2,z,1.5,.05,2,.55,'glass')
def crate(x,z,kind='supply'):
    idx=len(loot);loot.append({'id':f'crate-{idx}','x':x,'z':z,'kind':kind});box('Loot chest',x,z,.47,1.05,.78,.82,'wood' if kind=='supply' else 'vest',.09)
    for sx in [-.44,.44]:box('Chest reinforcing band',x+sx,z,.48,.095,.82,.85,'steel',.015)
    box('Chest lid',x,z,.91,1.10,.82,.12,'cream' if kind=='medical' else 'wood',.04)
    box('Chest latch',x,z+.412,.78,.16,.04,.17,'yellow',.014)
    if kind=='medical':box('Medical cross',x,z,.98,.42,.12,.014,'white',.004);box('Medical cross',x,z,.989,.12,.42,.014,'white',.004)
    solid('chest',x,z,1.05,.78,.9)
def bollard(x,z):cyl('Mooring bollard',x,z,.34,.22,.66,'yellow');cyl('Bollard cap',x,z,.68,.30,.12,'steel')
def lamp(x,z):
    cyl('Lamp pole',x,z,2.7,.067,5.4);box('Lamp arm',x+.6,z,5.34,1.3,.08,.09);box('Lamp housing',x+1.15,z,5.26,.54,.35,.11);box('Amber lamp',x+1.15,z,5.19,.45,.29,.02,'light')
    solid('lamp',x,z,.2,.2,5.4)
    return {'x':x+1.15,'z':z,'y':4.8}
box('Quay foundation',0,0,-.65,54,52,1.3,'concrete',.18)
box('Wet asphalt',0,0,.025,51.5,49.5,.07,'asphalt',.01)
for side in [-1,1]:box('Quay curb',side*26,0,.12,.5,52,.24,'concrete')
for z in [-25.7,25.7]:box('Quay curb',0,z,.12,54,.5,.24,'concrete')
for x in [-23,23]:
    for z in range(-22,25,4):box('Dashed road marking',x,z,.07,.12,1.8,.013,'yellow',.001)
for z in [-4,16]:
    for x in range(-20,22,4):box('Lane center stripe',x,z,.073,1.8,.13,.012,'cream',.001)
for x in [-18,-7,4,15]:
    container(x,7,['red','teal','blue','cream'][int((x+18)/11)],1 if x<0 else 2)
    container(x,-1,['blue','cream','teal','red'][int((x+18)/11)],1)
warehouse(-14,-15,15,11,'大井倉庫 04');warehouse(10,-16,10,8,'税関 / CUSTOMS')
for x,z,k in [(-18,13,'supply'),(-10,3,'medical'),(1,12,'supply'),(17,12,'supply'),(-19,-13,'supply'),(-12,-17,'valuable'),(7,-16,'valuable'),(13,-18,'medical'),(3,-7,'supply'),(20,-6,'valuable'),(-3,-21,'supply'),(20,20,'medical')]:crate(x,z,k)
for x,z in [(-24,-20),(-24,-4),(25,0),(25,12),(25,22)]:bollard(x,z)
lights=[lamp(x,z) for x,z in [(-23,19),(-23,0),(-23,-20),(23,-17),(23,3),(23,21),(0,-8)]]
for i in range(6):
    x=-22+i*1.4;box('Entry barrier',x,22,.5,1,.42,1,'concrete');solid('barrier',x,22,1,.42,1)
    for a in [-.3,.15]:o=box('Barrier hazard stripe',x+a,22.215,.55,.15,.017,.76,'yellow',.002);o.rotation_euler[1]=-.35
text('東京港  /  TOKYO PORT',0,19,.09,1.02,'cream',True)
text('04',-1,6,.10,2.0,'yellow',True)
text('STOP',-23,13,.08,.75,'cream',True)
# Gantry crane and port silhouettes outside the playable lanes.
for x in [24,32]:
    for z in [-7,7]:beam('Crane leg',(x,z,0),(x,z,12),.62,'orange')
for z in [-7,7]:
    beam('Crane top beam',(23,z,12),(40,z,12),.55,'orange')
    beam('Crane brace',(24,z,7),(31,z,12),.27,'orange')
beam('Crane cross bridge',(28,-7,12),(28,7,12),.75,'orange')
for x in range(25,39,2):beam('Crane truss',(x,-7,12),(x+1,-7,14),.15,'cream');beam('Crane truss',(x+1,-7,14),(x+2,-7,12),.15,'cream')
beam('Crane ridge',(25,-7,14),(39,-7,14),.22,'orange')
for z in [-1.4,1.4]:beam('Suspension cable',(35,z,12),(35,z,4),.035,'steel')
box('Container spreader',35,0,4,7,3.4,.32,'yellow')
# Small extraction launch, modeled hull, cabin and rails.
box('Extraction jetty',22,-22,.15,10,3,.32,'concrete')
for x in [19,21,23,25]:box('Jetty deck seam',x,-22,.327,.025,2.8,.014,'steel',0)
box('Launch hull',29,-22,-.12,6.8,2.75,1.05,'blue',.5);box('Launch deck',29,-22,.43,6.2,2.45,.20,'cream',.20);box('Pilot cabin',30,-22,1.03,2,1.8,1.18,'white',.16);box('Windshield',28.98,-22,1.16,.03,1.44,.62,'glass');box('Cabin roof',30,-22,1.69,2.25,2.1,.17,'blue',.10)
for z in [-23.1,-20.9]:beam('Launch rail',(26,z,.65),(31.5,z,.65),.035,'steel')
for z in [-23.15,-20.85]:
    for x in [27,29,31]:cyl('Rubber fender',x,z,.20,.18,.67,'rubber')
# Additional small-scale foreground details.
for x,z in [(-5,13),(21,4),(-22,-9),(4,-22)]:
    for dx,dz in [(0,0),(.6,.1),(.3,.65)]:cyl('Oil drum',x+dx,z+dz,.53,.28,1.02,'blue');cyl('Drum rim',x+dx,z+dz,1.04,.29,.05,'steel')
    solid('drums',x+.3,z+.3,1.3,1.3,1)
for i in range(9):
    x=-24+i*6;box('Drain grate',x,24,.08,.7,.35,.018,'steel',.01)
    for j in range(5):box('Drain slit',x-.28+j*.14,24,.096,.045,.31,.008,'rubber',0)
def export(objects,path):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True)
export(parts,ROOT+'/harbor.glb')
for o in parts:o.hide_set(True)
map_parts=parts.copy();parts=[]
# Original bird scavenger, with smooth organic shapes and separate walking limbs.
sphere('body',0,0,.71,(.35,.27,.45),'vest');sphere('head',0,-.04,1.26,(.30,.29,.32),'feather')
sphere('bill',0,-.32,1.21,(.19,.25,.08),'yellow')
for x in [-.20,.20]:sphere('eye',x,-.235,1.34,(.045,.027,.055),'rubber');sphere('eye glint',x-.009,-.259,1.36,(.011,.008,.014),'white')
sphere('helmet',0,.0,1.47,(.33,.31,.19),'vest');box('Helmet strap',0,-.272,1.38,.49,.055,.07,'rubber',.025)
box('backpack',0,.29,.87,.47,.24,.55,'wood',.12);box('Pack bedroll',0,.30,1.17,.53,.23,.17,'cream',.08)
for x in [-.18,.18]:box('Vest pouch',x,-.267,.78,.23,.14,.24,'cream',.05)
sphere('arm_L',-.32,-.12,.81,(.13,.21,.23),'vest');sphere('arm_R',.30,-.23,.87,(.13,.24,.17),'vest')
for name,x in [('leg_L',-.16),('leg_R',.16)]:sphere(name,x,.01,.25,(.115,.13,.23),'vest');sphere(name+'_foot',x,-.08,.095,(.14,.23,.095),'rubber')
export(parts,ROOT+'/scavenger.glb')
for o in parts:o.location.x-=18;o.location.y-=18
for o in map_parts:o.hide_set(False)
level={'bounds':{'minX':-25,'maxX':25,'minZ':-24,'maxZ':24},'spawn':{'x':-18,'z':18},'extraction':{'x':21,'z':-22,'radius':2.5,'duration':6},'colliders':colliders,'loot':loot,'lights':lights,'enemies':[{'x':-7,'z':-6},{'x':14,'z':14},{'x':-20,'z':-16},{'x':11,'z':-17},{'x':20,'z':-9},{'x':0,'z':-19},{'x':-2,'z':4},{'x':21,'z':6}]}
with open(ROOT+'/level.json','w',encoding='utf-8') as f:json.dump(level,f,indent=2,ensure_ascii=False)
scene.world=bpy.data.worlds.new('Blue hour');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.18,.26,.36,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
bpy.ops.object.light_add(type='SUN',location=(0,0,30));sun=bpy.context.object;sun.rotation_euler=(.5,-.5,-.5);sun.data.energy=2;sun.data.color=(.74,.83,1);sun.data.angle=.12
bpy.ops.object.light_add(type='AREA',location=(-15,-20,20));bpy.context.object.data.energy=3500;bpy.context.object.data.color=(1,.59,.27);bpy.context.object.data.shape='DISK';bpy.context.object.data.size=20
bpy.ops.object.camera_add(location=(38,-48,52));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=78;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.render.resolution_x=1700;scene.render.resolution_y=1250;scene.render.resolution_percentage=100;scene.render.filepath=ROOT+'/port-review.png'
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/TokyoHarbor.blend')
print('PORT COMPLETE',len(map_parts),'environment objects;',len(colliders),'colliders;',len(loot),'loot containers')
