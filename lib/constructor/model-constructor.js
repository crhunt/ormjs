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
    highlightNoParse: false,
    parse_xml: false 
};

ormjs.Model = class {
    
    id;
    objects = {};
    currentview;
    
    dragevent = {locations : ["bottom","right","top","left"],
                 all_locations: ["bottom","right","top","left"]};
    
    constructor(data) {

        if(arguments.length > 0) {
            data.id ? this.id = data.id : this.modelID();
            this.objects = data.objects;
            this.initialize_tolerance();
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

    static generateID(modelID,kind) {
        var objID = `id-${kind}-${ormjs.models[modelID].objects[`highest_${kind}_id`]}`;
        ormjs.models[modelID].objects[`highest_${kind}_id`] += 1;
        return objID
    }
}
