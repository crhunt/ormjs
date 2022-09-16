/* Model state information */

ormjs.Model = class {
    
    id;
    name;
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
            if ("objects" in data) {
                /* Model generation from data not safe. Don't do this yet.
                   Doesn't check for existence of model id. */
                data.id ? this.id = data.id : this.modelID();
                this.objects = data.objects;
                this.initialize_metamodel();
            } else {
                this.modelID();
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

    name(name) {
        if(arguments.length > 0) { 
            this.name = name;
        } else {
            return this.name
        }
    }

    initialize() {
        this.initialize_objects();
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
