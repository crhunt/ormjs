/* 
    Convert d3 data to ORM metamodel.
 */

var orm;
var conntypes;
var metamodel;

function parse_orm() {

    metamodel = { Objects: {}, Facts: {} };

    // Add all objects
    metamodel_add_objects();

    // Add all facts

    console.log(metamodel);
    // Convert to Rel
}

/* Add objects to metamodel */

function metamodel_add_objects() {
    
    // Add entities
    metamodel_add_entities();

    // Add values
    metamodel_add_values();
}

function metamodel_add_entities() {

    for (var objID in orm.entities ) {
        d = orm.entities[objID].datum();
        var obj = { 
            id: objID, 
            type: "EntityType",
            Name: d.name,
            _ReferenceMode: "id",
            PlayedRoles: object_plays_roles(orm.entities[objID]),
            PreferredIdentifier: ""
        }
        metamodel.Objects[objID] = obj;
    }
}

function metamodel_add_values() {

    for (var objID in orm.values ) {
        d = orm.values[objID].datum();
        var obj = { 
            id: objID, 
            type: "ValueType",
            Name: d.name,
            PlayedRoles: object_plays_roles(orm.entities[objID]),
            ConceptualDataType: ""
        }
        metamodel.Objects[objID] = obj;
    }
    // Need to add refmode from entities
}
