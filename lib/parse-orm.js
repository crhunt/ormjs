/* 
    Convert d3 data to ORM metamodel.

    Note the design here is to make a full pass over the model whenever 
    parse_orm() is triggered. So no incremental updates. However, the
    individual update functions are designed to make it easier to add
    functions for incremental updates in the future.
 */

/* Globals */
var orm; // Defined in parse-svg
var conntypes;
var metamodel; // Defined here
var mult_param; // Defined in rolebox-constructor

function parse_orm() {

    initialize_metamodel();

    // Add all objects
    metamodel_add_objects();

    // Add all facts
    metamodel_add_facts();

    // Add all constraints

    console.log(metamodel);
    
    // Convert to Rel
}

function initialize_metamodel() {
    metamodel = { Object: {}, Fact: {}, Constraint: {} };
}

function metamodel_add_objects() {
    
    // Add entities
    metamodel_add_entities();

    // Add values
    metamodel_add_values();

}

function metamodel_add_facts() {

    // Add facts (based on rolebox groups)
    for( var rbgID in orm.rbgroups ) {
        metamodel.Fact[rbgID] = metamodel_fact(orm.rbgroups[rbgID]);
    }

    // Add subtype facts

}

/* Add objects to metamodel */

function metamodel_add_entities() {

    for (var objID in orm.entities ) {
        metamodel.Object[objID] = metamodel_entity(orm.entities[objID]);
    }
}

function metamodel_entity(object) {
    var d = object.datum();
    var objID = object.attr("id");
    var obj = { 
        id: objID, 
        type: "EntityType",
        Name: d.name,
        ReferenceMode: "id",
        PlayedRoles: object_plays_roles(object),
        PreferredIdentifier: ""
    }
    return obj
}

function metamodel_add_values() {

    for (var objID in orm.values ) {
        metamodel.Object[objID] = metamodel_value(orm.values[objID]);
    }
    // Need to add refmode from entities
}

function metamodel_value(object) {
    var d = object.datum();
    var objID = object.attr("id");
    var obj = { 
        id: objID, 
        type: "ValueType",
        Name: d.name,
        PlayedRoles: object_plays_roles(object),
        ConceptualDataType: ""
    }
    return obj
}

/* Add facts to metamodel */

function metamodel_fact(rbgroup) {
    
    var rbgID = rbgroup.attr("id");
    var obj = {
        id: rbgID,
        type: "FactType",
        FactRoles: metamodel_add_roles(rbgroup),
        ReadingOrders: metamodel_reading_orders(rbgroup),
        InternalConstraints: []
    }
    return obj
}

function metamodel_add_roles(rbgroup) {

    /* Convert each rolebox in the fact into a fact object. */

    // Get ordered list of roles
    var boxes = [...rbgroup.datum().boxes];
    if( rbgroup.datum().flipped ){ boxes.reverse(); }
    var multmap = map_multiplicity(rbgroup);

    var factroles = {};
    for (var n in boxes) {
        factroles[boxes[n]] = metamodel_role(orm.roleboxes[boxes[n]], multmap);
    }

    return factroles
}

function metamodel_role(rbox, multmap) {
    
    var objID = rbox.attr("id");
    var d = rbox.datum();

    var obj = {
        id: objID,
        Name: d.name,
        IsMandatory: d.mandatory,
        Multiplicity: multmap[d.multiplicity],
        RolePlayer: d.entity
    }
    return obj
}

function map_multiplicity(rbgroup) {

    /* Map from ORMJS label for box to ORM metamodel label */

    var multmap = {};
    multmap[mult_param.one] = "ExactlyOne";
    multmap[mult_param.many] = "ZeroToMany";

    // Get multiplicity of all boxes
    var multlist = [];
    var boxes = rbgroup.datum().boxes;
    for (var n in boxes) {
        multlist.push( orm.roleboxes[boxes[n]].datum().multiplicity )
    }
    if ( multlist.includes(mult_param.many) ) {
        multmap[mult_param.none] = "ExactlyOne";
        multmap[mult_param.skip] = "ExactlyOne";
    } 
    else {
        multmap[mult_param.none] = "ZeroToMany";
        multmap[mult_param.skip] = "ZeroToMany";
    }

    return multmap
}

function metamodel_reading_orders(rbgroup) {

    /* Add reading orders to fact */

    var reading_order = {};

    // Create forward reading order
    var ronum = 0;
    reading_order[ronum] = metamodel_forward_reading_order(rbgroup,ronum);
    ronum += 1;

    return reading_order
}

function metamodel_forward_reading_order(rbgroup,ronum) {

    /* Create all readings that use the forward reading order */

    var roID = rbgroup.attr("id")+"-reading-order-"+ronum.toString();
    // Get ordered list of roles
    var boxes = [...rbgroup.datum().boxes];
    if( rbgroup.datum().flipped ){ boxes.reverse(); }
    
    // Get all readings
    // Basic reading (no constraints)
    var readings = [metamodel_forward_reading(rbgroup)];
    // Mandatory constraints
    // TO DO
    // Uniqueness constraints
    // TO DO
    
    // Organize as a reading order
    var obj = {
        id: roID,
        Readings: readings,
        RoleSequence: boxes
    }

    return obj
}

function metamodel_forward_reading(rbgroup) {
    
    // Get ordered list of roles
    var boxes = [...rbgroup.datum().boxes];
    if( rbgroup.datum().flipped ){ boxes.reverse(); }
    
    // Add first box
    var data = "{0} " + orm.roleboxes[boxes[0]].datum().name; // A string of the reading
    var expanded_data = []; // Broken down as entity indices and text
    expanded_data.push( {RoleIndex: 0, FollowingText: orm.roleboxes[boxes[0]].datum().name} );
    if( boxes.length > 1 ) {
        // Add second box (this is separate because may not have name)
        if ( orm.roleboxes[boxes[1]].datum().name.length > 0 ) {
            data += " " + orm.roleboxes[boxes[1]].datum().name;
        }
        data += " {1}";
        expanded_data.push( {RoleIndex: 1, 
                             PrecedingText: orm.roleboxes[boxes[1]].datum().name} );
        // Add additional boxes
        var rng = range(boxes.length-2, startAt=2);
        for ( var n in rng ) {
            data += " " + orm.roleboxes[ boxes[ rng[n] ] ].datum().name + 
                    "{" + rng[n].toString() + "}"
            expanded_data.push( { RoleIndex: rng[n], 
                                  PrecedingText: orm.roleboxes[ boxes[ rng[n] ] ].datum().name } );
        }
    }
    
    // Organize as a Reading
    var obj = {
        id: rbgroup.attr("id")+"-reading-0",
        Data: data,
        ExpandedData: expanded_data
    }
    return obj
    
}