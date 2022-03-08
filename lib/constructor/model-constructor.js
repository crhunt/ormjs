/* Model state information */

// Note: TO DO: proper ormjs data initializer

var ormjs = {
    models: {},
    highest_model_id: 0
};

ormjs.object_kinds = ["view", "constraint", "entity", "value", 
                      "connector", "rolebox", "rolebox_group"];

ormjs.tolerance = { link : {}, snap : {} };

ormjs.default_dragevent = ["bottom","right","top","left"];

// Display settings defaults
ormjs.display = { 
    shortFormat: true,
    graphFormat: false
};

ormjs.Model = class {
    
    id;
    objects = {};
    currentview;
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
            this.objects = data.objects;
            this.initialize_tolerance();
            ormjs.models[this.id] = this;
        } else {
            this.modelID();
            this.initialize();
        }
    }

    modelID() {
        var objID = `id-model-${ormjs.highest_model_id}`;
        ormjs.highest_model_id += 1;
        this.id = objID;
        ormjs.models[objID] = this;
    }

    initialize() {
        this.initialize_objects();
        this.initialize_tolerance();
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

    initialize_tolerance() {
        ormjs.tolerance.link = {
            entity: 2*ormjs.size.entity.height,
            value: 2*ormjs.size.value.height,
            rolebox: ormjs.size.rolebox.width,
            constraint: ormjs.size.constraint.oradius,
            connector: ormjs.size.connector.wide_stroke
        };
        ormjs.tolerance.snap = {
            entity: 2*ormjs.size.entity.height/10,
            value: 2*ormjs.size.value.height/10,
            rolebox: ormjs.size.rolebox.width/10,
            rolebox_group: ormjs.size.rolebox.width/10,
            constraint: ormjs.size.constraint.radius/5
        };
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
    }

    static generateID(modelID,kind) {
        var objID = `id-${kind}-${ormjs.models[modelID].objects[`highest_${kind}_id`]}`;
        ormjs.models[modelID].objects[`highest_${kind}_id`] += 1;
        return objID
    }
}
