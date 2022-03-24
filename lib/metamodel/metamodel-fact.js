/* Metamodel Facts */

var ormjs;

ormjs.Fact = class {
    
    id;
    model;
    type = "FactType";
    FactRoles = [];
    ReadingOrder = [];
    InternalConstraints = [];
    _Name;
    _rbgID;
    _Shadows;
    _multmap;
    XML = "";

    constructor(n, rbgroup) {
        //this.id = `metamodel-fact-${n.toString()}`;
        this.id = `fact-${n}-${rbgroup.model}`;
        this.model = rbgroup.model;
        this._rbgID = rbgroup.id;
        this.InternalConstraints = [];
        this._Name = rbgroup.d3object.datum().name;
        this._Shadows = [ rbgroup.id ];
        this.add_roles(rbgroup);
    }

    populate_shadows() {

        /* Look across facts and if others have the same relname, they
           are considered shadows. */

        // Get shadowing information
        var metamodel = ormjs.models[this.model].metamodel;
        var matchlist = metamodel.find_fact( this );
        
        // Add shadowing information
        if (matchlist.length > 0) {
            for (var n in matchlist) {
                var rbgIDn = ormjs.GraphUtils.key_from_value(metamodel.m2mm, matchlist[n]);
                if (rbgIDn != this._rbgID) {
                    metamodel.Fact[matchlist[n]]._Shadows.push( this._rbgID );
                    this._Shadows.push( rbgIDn );
                }
            }
        }
    }

    populate_reading_orders() {
        
        /* Add reading orders to fact */

        // Create forward reading order
        var ronum = 0;
        var ro = new ormjs.ReadingOrder(ronum, this);
        this.ReadingOrder.push( ro );
        ro.set_sequence("forward");
        ronum += 1;
        
        // Create backward reading order
        // TO DO
    }

    toXML() {
        
        /* Add XML representation of the Fact */
        
        var t = "    ";
        this.XML = `<orm:Fact id="${this.id}" _Name="${this._Name}">\n`;
        this.XML += `${t}<orm:FactRoles>\n`;
        // FactRoles
        this.FactRoles.map( (role) => {
            role.toXML();
            var xml = (' ' + role.XML).slice(1); // Deep copy
            xml = xml.replaceAll(`\n`,`\n${t.repeat(2)}`); // Indent
            this.XML += `${t.repeat(2)}${xml}\n`; // Add to model
        } );
        this.XML += `${t}</orm:FactRoles>\n`;
        // ReadingOrders
        this.XML += `${t}<orm:ReadingOrders>\n`;
        this.ReadingOrder.map( (ro) => {
            ro.toXML();
            var xml = (' ' + ro.XML).slice(1); // Deep copy
            xml = xml.replaceAll(`\n`,`\n${t.repeat(2)}`); // Indent
            this.XML += `${t.repeat(2)}${xml}\n`; // Add to model
        } );
        this.XML += `${t}</orm:ReadingOrders>\n`;
        this.XML += `</orm:Fact>`;
    }

    add_roles(rbgroup) {

        /* Convert each rolebox in the fact into a fact object. */

        this.multiplicity(rbgroup);
    
        // Get ordered list of roles
        var boxes = [...rbgroup.d3object.datum().boxes];
        if( rbgroup.d3object.datum().flipped ){ boxes.reverse(); }
    
        var factroles = [];
        var roleboxes = ormjs.models[rbgroup.model].objects.rolebox;
        for (var n in boxes) {
            factroles[n] = new ormjs.Role(n, roleboxes[boxes[n]]);
            factroles[n].toFact(this);
        }

        this.FactRoles = factroles;
    
        //return factroles
    }

    multiplicity(rbgroup) {

        /* Map from ORMJS label for box to ORM metamodel label */
    
        var mult_param = ormjs.Rolebox.multiplicity();
        var multmap = {};
        multmap[mult_param.one] = "ExactlyOne";
        multmap[mult_param.many] = "ZeroToMany";
    
        // Get multiplicity of all boxes
        var multlist = [];
        var boxes = rbgroup.d3object.datum().boxes;
        var roleboxes = ormjs.models[rbgroup.model].objects.rolebox;
        for (var n in boxes) {
            multlist.push( roleboxes[boxes[n]].d3object.datum().multiplicity )
        }
        if ( multlist.includes(mult_param.many) ) {
            multmap[mult_param.none] = "ExactlyOne";
            multmap[mult_param.skip] = "ExactlyOne";
        } 
        else {
            multmap[mult_param.none] = "ZeroToMany";
            multmap[mult_param.skip] = "ZeroToMany";
        }
    
        this._multmap = multmap
    }

    /* Functions related to parsing to Rel
       Function definitions in parse-to-rel.js. */

    fill_readings() {
        
        /* Add entities to Reading.Data and Reading._RelData for all readings in fact */

        var metamodel = ormjs.models[this.model].metamodel;

        // Map role to entity for all roles in fact
        var role_map = { "data": {}, "rel": {}, "atom": {}, "atom_key": {} };
        var objlist = [];
        for (var n in this.FactRoles) {
            var key = `{${n}}`;
            var akey = `{a${n}}`;
            var objID = this.FactRoles[n].RolePlayer;
            if (objID != null) { 
                role_map["data"][key] = metamodel.Object[objID].Name; 
                role_map["rel"][key] = metamodel.Object[objID]._RelName; 
                role_map["atom"][key] = metamodel.Object[objID]._Atom; 
                role_map["atom_key"][key] = akey;
                objlist.push.apply(objlist, metamodel.Object[objID]._Shadows);
            }
        }
        // TO DO: make sure atoms don't have duplicates

        this.ReadingOrder.map( (ro) => {
            ro.Reading.map( (reading) => {
                var data = reading.Data;
                var reldata = [...reading._RelData];
                for (var key in role_map["data"]) {
                    data = data.replaceAll(key, role_map["data"][key]);
                    reldata = reldata.map( e => e.replaceAll(key, role_map["rel"][key]) );
                    reldata = reldata.map( e => e.replaceAll(role_map["atom_key"][key], 
                                                            role_map["atom"][key]) );
                }
                if ( data.includes("{") ) {
                    data = null;
                    reldata = [];
                } else {
                    metamodel.relIDs.push.apply(metamodel.relIDs, reading._includedIDs);
                    metamodel.relIDs.push.apply(metamodel.relIDs, objlist);
                }
                reading._Statement = data;
                reading._RelStatement = reldata;
            } );
        } );
    }

}