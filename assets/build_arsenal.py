"""Original exterior-only game meshes. Run with Blender Python; exports GLB and .blend."""
import bpy, math, os, json
from mathutils import Vector
ROOT = 'D:/Github/Guns'
OUT = ROOT + '/public/models'
os.makedirs(OUT, exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
old=bpy.data.collections.get('ARSENAL — game assets')
if old:
    for o in list(old.objects): bpy.data.objects.remove(o,do_unlink=True)
    bpy.data.collections.remove(old)
for o in list(bpy.data.objects):
    if o.name.startswith('Arsenal '): bpy.data.objects.remove(o,do_unlink=True)
collection = bpy.data.collections.new('ARSENAL — game assets')
bpy.context.scene.collection.children.link(collection)
materials = {}
for name, color, metal, rough in [('steel',(0.085,.10,.12,1),.85,.29),('edge',(.18,.20,.22,1),.8,.26),('black',(.024,.031,.039,1),.2,.48),('wood',(.28,.09,.027,1),0,.38),('silver',(.48,.53,.58,1),.9,.22),('rubber',(.015,.018,.02,1),0,.82),('glass',(.08,.38,.38,1),.65,.16)]:
    m=bpy.data.materials.new(name); m.diffuse_color=color; m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value=color; bs.inputs['Metallic'].default_value=metal; bs.inputs['Roughness'].default_value=rough
    if name=='wood':
        n=m.node_tree.nodes; noise=n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=7; noise.inputs['Detail'].default_value=3
        tex=n.new('ShaderNodeTexCoord'); mapping=n.new('ShaderNodeVectorMath'); mapping.operation='MULTIPLY'; mapping.inputs[1].default_value=(2,45,60)
        ramp=n.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color=(.055,.013,.005,1); ramp.color_ramp.elements[1].color=(.34,.13,.038,1)
        m.node_tree.links.new(tex.outputs['Generated'],mapping.inputs[0]); m.node_tree.links.new(mapping.outputs[0],noise.inputs['Vector']); m.node_tree.links.new(noise.outputs['Fac'],ramp.inputs[0]); m.node_tree.links.new(ramp.outputs[0],bs.inputs['Base Color'])
    materials[name]=m
parts=[]
def finish(o,name,mat,bevel=0):
    o.name=name; o.data.materials.append(materials[mat]); parts.append(o)
    for c in list(o.users_collection): c.objects.unlink(o)
    collection.objects.link(o)
    if bevel:
        mod=o.modifiers.new('Soft machined edges','BEVEL'); mod.width=bevel; mod.segments=3
        o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    return o
def box(name,loc,size,mat='steel',bevel=.008):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o=bpy.context.object; o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,name,mat,bevel)
def cyl(name,loc,r,length,mat='steel',axis='X',vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=length,location=loc)
    o=bpy.context.object
    if axis=='X':o.rotation_euler[1]=math.pi/2
    elif axis=='Y':o.rotation_euler[0]=math.pi/2
    for p in o.data.polygons:p.use_smooth=True
    return finish(o,name,mat,.003)
def poly(name,points,width,mat='wood',bevel=.012,y=0):
    n=len(points); verts=[(x,y+s*width/2,z) for s in [-1,1] for x,z in points]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);collection.objects.link(o)
    return finish(o,name,mat,bevel)
def line(name,points,r=.012,mat='steel'):
    for i,(a,b) in enumerate(zip(points,points[1:])):
        a,b=Vector(a),Vector(b);o=cyl(name+str(i),(a+b)/2,r,(b-a).length,mat,axis='Z',vertices=16);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
def guard(x,z,s=1):
    line('Trigger guard',[(x-.11*s,0,z),(x-.12*s,0,z-.105*s),(x+.09*s,0,z-.105*s),(x+.13*s,0,z),(x-.11*s,0,z)],.012*s)
    line('Trigger',[(x-.02*s,0,z),(x-.005*s,0,z-.06*s),(x-.03*s,0,z-.08*s)],.009*s)
def screws(xs,z,width=.13):
    for x in xs:
        for y in [-width/2-.002,width/2+.002]:cyl('Receiver pin',(x,y,z),.012,.006,'edge','Y',16)
def accessories(end,top,grip,allow_grip=True,allow_muzzle=True):
    box('optic_red_mount',(-.12,0,top+.022),(.19,.11,.035),'black')
    box('optic_red_body',(-.12,0,top+.09),(.12,.11,.11),'black')
    box('optic_red_lens',(-.052,0,top+.10),(.007,.075,.071),'glass',.003)
    for x in [-.26,.02]:box('optic_scope_mount',(x,0,top+.06),(.055,.09,.12),'black')
    cyl('optic_scope_tube',(-.12,0,top+.17),.046,.54)
    for x in [-.39,.15]:
        cyl('optic_scope_bell',(x,0,top+.17),.073,.11)
        cyl('optic_scope_glass',(x+(.057 if x>0 else -.057),0,top+.17),.063,.003,'glass')
    cyl('optic_scope_turret',(-.1,0,top+.23),.034,.07,'black','Z')
    if allow_muzzle:
        cyl('muzzle_suppressor',(end+.14,0,.12),.064,.28,'black')
        for x in [end+.025,end+.25]:cyl('muzzle_suppressor_band',(x,0,.12),.067,.015,'edge')
        cyl('muzzle_suppressor_bore',(end+.282,0,.12),.027,.003,'rubber')
        cyl('muzzle_compensator',(end+.06,0,.12),.045,.12,'edge')
        for i in range(3):box('muzzle_compensator_slot',(end+.025+i*.026,-.043,.12),(.012,.004,.037),'rubber',.001)
    if allow_grip:
        box('under_grip_mount',(grip,0,-.02),(.16,.10,.04),'black')
        o=box('under_grip_body',(grip-.025,0,-.16),(.078,.075,.25),'rubber',.025);o.rotation_euler[1]=-.13
        cyl('under_light_body',(grip,-.11,-.015),.05,.22,'black')
        cyl('under_light_lens',(grip+.112,-.11,-.015),.042,.003,'glass')
def rifle_stock(start=-.38,end=-1.12,mat='wood'):
    poly('Shoulder stock',[(start,.17),(start-.10,.155),(start-.18,.15),(end+.12,.105),(end+.025,.095),(end,.065),(end,-.20),(end+.035,-.235),(end+.11,-.235),(start-.23,-.075),(start-.13,-.03),(start,-.015)],.135,mat,.025)
    box('Butt plate',(end,0,-.06),(.035,.145,.33),'rubber',.01)
def grip(x,mat='wood'):
    poly('Pistol grip',[(x-.075,-.035),(x+.065,-.035),(x+.058,-.09),(x+.032,-.17),(x+.012,-.29),(x+.005,-.34),(x-.025,-.355),(x-.14,-.325),(x-.145,-.30)],.105,mat,.018)
def build(kind):
    global parts
    parts=[]
    if kind=='ak47':
        rifle_stock();box('Stamped receiver',(-.13,0,.065),(.59,.145,.21))
        cyl('Rounded dust cover',(-.14,0,.18),.078,.57);box('Dust cover lower',(-.14,0,.15),(.58,.155,.08))
        grip(-.29);guard(-.1,-.04)
        poly('Curved magazine',[(0,-.025),(.15,-.02),(.20,-.22),(.30,-.44),(.17,-.50),(.075,-.29)],.10,'steel')
        for side in [-.053,.053]:
            for i in range(3):line('Magazine ribs',[(.03+i*.038,side,-.07),(.08+i*.038,side,-.26),(.18+i*.038,side,-.44)],.006,'edge')
        poly('Lower handguard',[(.18,.10),(.57,.09),(.57,-.005),(.2,-.02)],.15)
        cyl('Upper wooden handguard',(.36,0,.20),.063,.30,'wood')
        cyl('Barrel',(.72,0,.12),.029,.52);cyl('Gas tube',(.57,0,.225),.027,.34)
        poly('Gas block',[(.64,.12),(.68,.26),(.74,.26),(.74,.12)],.069,'steel')
        poly('Front sight tower',[(.867,.12),(.917,.12),(.91,.265),(.88,.265)],.048,'steel',.003)
        line('Front sight ears',[(.89,-.046,.31),(.89,-.046,.265),(.89,.046,.265),(.89,.046,.31)],.011)
        box('Front sight blade',(.89,0,.288),(.018,.012,.037))
        cyl('Muzzle crown',(.995,0,.12),.037,.05);cyl('Dark muzzle',(1.022,0,.12),.02,.002,'rubber')
        box('Rear sight',(.16,0,.28),(.10,.075,.035));screws([-.36,-.23,.08],.04,.15)
        line('Selector lever',[(-.27,-.081,.09),(.045,-.081,.02)],.012)
        box('Charging handle',(.025,-.12,.15),(.10,.10,.025));accessories(1.02,.27,.4)
    elif kind=='ar15':
        cyl('Buffer tube',(-.64,0,.13),.045,.43)
        poly('Adjustable stock',[(-.95,.20),(-.53,.20),(-.55,.05),(-.8,-.15),(-1.0,-.15)],.13,'black');box('Butt pad',(-.99,0,.025),(.035,.15,.36),'rubber')
        poly('Lower receiver',[(-.43,.12),(.14,.12),(.12,-.11),(-.06,-.13),(-.13,-.04),(-.43,-.02)],.14,'steel')
        box('Upper receiver',(-.15,0,.18),(.56,.14,.15));grip(-.31,'black');guard(-.13,-.02)
        poly('Magazine',[(-.055,-.07),(.105,-.07),(.11,-.29),(.17,-.45),(.005,-.48),(-.035,-.32)],.095,'black')
        for i in range(3):box('Magazine ridge',(.006+i*.034,-.052,-.29),(.012,.009,.24),'edge',.003)
        cyl('Free float handguard',(.40,0,.13),.095,.56,'black',vertices=8)
        for i in range(7):
            for y in [-.09,.09]:box('MLOK slot',(.17+i*.069,y,.13),(.046,.003,.025),'rubber',.006)
        for i in range(27):box('Top rail tooth',(-.40+i*.04,0,.266),(.022,.11,.018),'edge',.002)
        cyl('Barrel',(.79,0,.12),.026,.27);cyl('Flash hider',(.965,0,.12),.041,.10)
        box('Ejection port',(-.08,-.075,.18),(.20,.009,.065),'rubber');box('Bolt catch',(-.22,-.083,.03),(.045,.02,.052))
        screws([-.35,.05],.015,.15);box('Rear sight',(-.37,0,.31),(.05,.08,.08));box('Front sight',(.63,0,.31),(.04,.055,.08));accessories(1.02,.28,.39)
    elif kind=='kar98k':
        poly('Full walnut stock',[(-1.17,.11),(-1.08,.12),(-.80,.095),(-.63,.082),(-.50,.11),(-.40,.155),(-.33,.17),(-.07,.10),(.69,.065),(.71,.025),(.70,-.035),(.53,-.047),(-.20,-.06),(-.35,-.08),(-.48,-.13),(-.58,-.15),(-.70,-.115),(-1.08,-.26),(-1.16,-.26)],.14,'wood',.024)
        box('Steel buttplate',(-1.175,0,-.073),(.025,.15,.37),'edge')
        cyl('Receiver',(-.27,0,.16),.065,.40);cyl('Barrel',(.50,0,.12),.027,1.11)
        cyl('Bolt',(-.33,-.013,.20),.031,.31,'silver');line('Bent bolt handle',[(-.36,-.02,.2),(-.36,-.15,.18),(-.36,-.19,.045)],.022)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,radius=.044,location=(-.36,-.19,.045));finish(bpy.context.object,'Bolt knob','steel')
        guard(-.34,-.08);box('Floor plate',(-.24,0,-.085),(.32,.11,.025))
        for x in [.38,.67]:box('Stock barrel band',(x,0,.028),(.047,.151,.15))
        box('Rear tangent sight',(.06,0,.22),(.22,.052,.034));box('Front sight',(.97,0,.17),(.065,.05,.12))
        cyl('Muzzle bore',(1.057,0,.12),.017,.002,'rubber');accessories(1.06,.25,.4,False,False)
    elif kind=='shotgun':
        rifle_stock(-.33,-1.05);poly('Receiver',[(-.33,.02),(-.33,.16),(-.29,.215),(.13,.215),(.17,.18),(.17,-.015),(-.28,-.015)],.15,'steel',.013);guard(-.20,-.02)
        cyl('Barrel',(.59,0,.12),.044,1.0);cyl('Magazine tube',(.39,0,.018),.039,.76)
        cyl('Wooden pump',(.35,0,.008),.075,.36,'wood')
        for i in range(11):cyl('Pump rib',(.20+i*.029,0,.008),.080,.010,'wood')
        box('Ejection port',(-.015,-.077,.13),(.20,.004,.086),'rubber');box('Bead sight',(1.03,0,.17),(.02,.019,.025),'silver')
        cyl('Muzzle bore',(1.092,0,.12),.031,.003,'rubber');accessories(1.09,.24,.35,False,True)
    elif kind in ['glock','1911']:
        classic=kind=='1911'; mat='silver' if classic else 'steel'
        box('Slide',(.02,0,.16),(.53,.087,.115),mat,.015)
        poly('Pistol frame',[(-.24,.102),(.25,.102),(.25,.025),(-.08,.012),(-.14,-.29),(-.32,-.27),(-.23,.01)],.082,mat if classic else 'black',.015)
        poly('Grip panels',[(-.218,.004),(-.105,-.022),(-.16,-.259),(-.29,-.245)],.095,'wood' if classic else 'rubber',.015)
        guard(-.026,.023,.7);box('Magazine base',(-.221,0,-.283),(.17,.096,.026),'black')
        for i in range(9):
            for y in [-.045,.045]:box('Slide serration',(-.22+i*.009,y,.161),(.004,.005,.077),'rubber',.001)
        for i in range(10):
            for j in range(6):box('Grip stipple',(-.26+i*.010+j*.007,-.049,-.23+j*.032),(.004,.003,.014),'black',.001)
        box('Ejection port',(.055,-.045,.18),(.093,.003,.053),'black',.003)
        cyl('Barrel muzzle',(.289,0,.163),.022,.009,mat);cyl('Muzzle bore',(.295,0,.163),.014,.002,'rubber')
        box('Rear sight',(-.208,0,.237),(.027,.068,.027),'black');box('Front sight',(.224,0,.233),(.024,.015,.025),'black')
        box('Slide stop',(-.11,-.049,.077),(.072,.018,.012));screws([-.19],-.06,.10)
        if classic:box('Hammer',(-.258,0,.187),(.055,.038,.045));box('Grip safety',(-.267,0,.053),(.08,.056,.027))
        accessories(.295,.248,.12,True,True)
        for o in parts:
            if o.name.startswith('muzzle_'):o.location.z+=.043
    else:
        poly('Revolver frame',[(-.22,.21),(.10,.21),(.14,.06),(.035,-.04),(-.06,-.05),(-.16,-.27),(-.33,-.22),(-.27,.02)],.10,'silver')
        poly('Walnut grip',[(-.26,.025),(-.14,-.025),(-.19,-.31),(-.37,-.27),(-.34,-.14)],.115,'wood')
        drum=cyl('Cylinder',(-.045,0,.12),.105,.20,'silver')
        for i in range(6):
            a=i*math.tau/6;y=math.sin(a)*.087;z=.12+math.cos(a)*.087
            cutter=cyl('Temporary flute cutter',(-.045,y*1.24,.12+(z-.12)*1.24),.026,.145,'steel')
            mod=drum.modifiers.new('Exterior cylinder flute','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
            bpy.context.view_layer.objects.active=drum;bpy.ops.object.modifier_apply(modifier=mod.name)
            parts.remove(cutter);bpy.data.objects.remove(cutter,do_unlink=True)
            cyl('Cylinder front inset',(.057,y*.69,.12+(z-.12)*.69),.018,.003,'rubber')
        cyl('Barrel',(.28,0,.12),.041,.43,'silver');box('Underlug',(.26,0,.062),(.42,.06,.064),'silver')
        box('Top rib',(.25,0,.168),(.48,.044,.02),'silver');box('Front sight',(.446,0,.20),(.045,.016,.04),'black')
        cyl('Muzzle bore',(.498,0,.12),.024,.003,'rubber');box('Hammer',(-.238,0,.20),(.055,.031,.07),'steel');guard(-.04,.002,.85)
        screws([-.235],-.10,.12);accessories(.50,.24,.3,False,False)
    return parts
manifest=[]
for index,kind in enumerate(['ak47','glock','kar98k','shotgun','ar15','revolver','1911']):
    objects=build(kind)
    # Improve side-profile proportions consistently across every visible attachment.
    if kind in ['glock','1911','revolver']:
        sx,sz=(1.20,.86) if kind!='revolver' else (1.12,.93)
        for o in objects:
            o.location.x*=sx;o.location.z*=sz
            bpy.context.view_layer.objects.active=o;o.select_set(True)
            bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
            for v in o.data.vertices:v.co.x*=sx;v.co.z*=sz
            o.select_set(False)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.export_scene.gltf(filepath=OUT+'/'+kind+'.glb',export_format='GLB',use_selection=True,export_apply=True)
    manifest.append({'id':kind,'objects':len(objects),'file':kind+'.glb'})
    for o in objects:
        o['weapon']=kind
        o.location.z+=index*1.15
        if o.name.startswith(('optic_','muzzle_','under_')):o.hide_render=True;o.hide_set(True)
with open(OUT+'/manifest.json','w') as f:json.dump(manifest,f,indent=2)
scene=bpy.context.scene
for o in scene.objects:
    if o.name in ['Cube','Light','Camera']:o.hide_render=True;o.hide_set(True)
scene.world.color=(.12,.12,.12)
for name,location,power,size in [('Key',(1,-5,8),1800,7),('Rim',(-2,3,6),2100,5)]:
    bpy.ops.object.light_add(type='AREA',location=location);o=bpy.context.object;o.name='Arsenal '+name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,3))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(3,-12,7));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,3.5))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=8.7;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1000;scene.render.resolution_y=1400;scene.render.resolution_percentage=100
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/assets/Arsenal.blend')
print(json.dumps(manifest))
