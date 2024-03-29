/* Model state information */

ormjs.Model = class {
    
    id;
    objects = {};
    currentview = null;
    metamodel;
    rel_target = null;
    xml_target = null;
    generate_xml = false;
    generate_rel = true;
    
    dragevent = {locations : ["bottom","right","top","left"],
                 all_locations: ["bottom","right","top","left"]};
    
    constructor(data) {

        if(arguments.length > 0) {
            data.id ? this.id = data.id : this.modelID();
            if ("objects" in data) {
                this.objects = data.objects
                this.initialize_tolerance();
                this.initialize_metamodel();
            } else {
                this.initialize();
            }
        } else {
            this.modelID();
            this.initialize();
        }

        this.record();
        
    }

    modelID() {
        var objID = `ormjsid-model-${ormjs.highest_model_id}`;
        ormjs.highest_model_id += 1;
        this.id = objID;
    }

    record() {
        ormjs.models[this.id] = this;
    }

    initialize() {
        this.initialize_objects();
        //this.initialize_tolerance();
        this.initialize_metamodel();
    }

    initialize_metamodel() {
        this.metamodel = new ormjs.Metamodel(this.id);
    }

    initialize_objects() {
        ormjs.object_kinds.map( (name) => {
            this.objects[name] = {};
            this.objects[`highest_${name}_id`] = 0;
        });
    }

    /*initialize_tolerance() {
        ormjs.tolerance.link = {
            entity: 2*ormjs.size.entity.height,
            value: 2*ormjs.size.value.height,
            rolebox: ormjs.size.rolebox.width,
            constraint: ormjs.size.constraint.oradius,
            connector: ormjs.size.connector.wide_stroke
        };
        var f = 0.4;
        ormjs.tolerance.snap = {
            entity: f*2*ormjs.size.entity.height/15,
            value: f*2*ormjs.size.value.height/15,
            rolebox: f*ormjs.size.rolebox.width/10,
            predicate: f*ormjs.size.rolebox.width/10,
            constraint: ormjs.size.constraint.radius/5
        };
    }*/

    set_current_view(viewID) {
        this.currentview = this.objects.view[viewID];
    }

    populate_metamodel() {

        // Instantiate new metamodel
        this.initialize_metamodel();
        this.metamodel.populate();

    }

    update() {

        // Populate metamodel
        this.populate_metamodel();

        // Populate rel
        if ( this.generate_rel ) {
            // Convert to Rel
            ormjs.GenerateRel.parse( this.metamodel );
            // Display Rel code
            ormjs.GenerateRel.display_rel( this );
        }
        if ( this.generate_xml ) {
            this.metamodel.display_xml();
        }

        // Display shadows in ORM diagram
        ormjs.Graph.add_shadows(this.metamodel);
    }

    static generateID(modelID,kind) {
        var highest = ormjs.models[modelID].objects[`highest_${kind}_id`];
        var objID = `ormjsid-${kind}-${highest}`;
        ormjs.models[modelID].objects[`highest_${kind}_id`] += 1;
        return objID
    }
}
