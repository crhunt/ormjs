/* Metamodel Facts */

var orm; // Defined in parse-svg
var metamodel; // Defined in metamodel-constructor
var mult_param; // Defined in rolebox-constructor

class Fact {
    
    id;
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
        this.id = `metamodel-fact-${n.toString()}`;
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
        var matchlist = metamodel.find_fact( this );
        
        // Add shadowing information
        if (matchlist.length > 0) {
            for (var n in matchlist) {
                var rbgIDn = GraphUtils.key_from_value(metamodel.ormjs, matchlist[n]);
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
        var ro = new ReadingOrder(ronum, this);
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
        this.FactRoles.map( (e) => {
            e.toXML();
            var xml = (' ' + e.XML).slice(1); // Deep copy
            xml = xml.replaceAll(`\n`,`\n${t.repeat(2)}`); // Indent
            this.XML += `${t.repeat(2)}${xml}\n`; // Add to model
        } );
        this.XML += `${t}</orm:FactRoles>\n`;
        // ReadingOrders
        this.XML += `${t}<orm:ReadingOrders>\n`;
        this.ReadingOrder.map( (e) => {
            e.toXML();
            var xml = (' ' + e.XML).slice(1); // Deep copy
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
        for (var n in boxes) {
            factroles[n] = new Role(n, orm.roleboxes[boxes[n]]);
            factroles[n].toFact(this);
        }

        this.FactRoles = factroles;
    
        //return factroles
    }

    multiplicity(rbgroup) {

        /* Map from ORMJS label for box to ORM metamodel label */
    
        var multmap = {};
        multmap[mult_param.one] = "ExactlyOne";
        multmap[mult_param.many] = "ZeroToMany";
    
        // Get multiplicity of all boxes
        var multlist = [];
        var boxes = rbgroup.d3object.datum().boxes;
        for (var n in boxes) {
            multlist.push( orm.roleboxes[boxes[n]].d3object.datum().multiplicity )
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
        _fill_readings(this);
    }

}