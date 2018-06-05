// Midgame:
// "{"transistors":0,"transistorsBuilt":1579,"computers":8120.616000000094,"computersBuilt":1354,"factories":19,"factoriesBuilt":19,"factoriesBuiltLastTime":1528184971802,"labs":16,"labsBuilt":16,"research":32576.200000000055,"researchBuilt":128826.19999999963,"integratedCircuits":0,"integratedCircuitsBuilt":117314.07999999894,"popularity":67.66090925973637,"popularityLostToUnemployment":0,"unemployment":1.058756466984667e-16,"aiWinterPopularityThreshold":55.4749245069211,"activeEvents":{},"R_INTEGRATED_CIRCUITS":1,"E_FIRST_TRANSISTOR":1,"E_FIRST_TRANSISTOR_T":1528184764016,"E_FIRST_COMPUTER":1,"E_FIRST_COMPUTER_T":1528184767226,"R_INTEGRATED_CIRCUITS_T":1528184806230,"E_FIRST_INTEGRATED_CIRCUIT":1,"E_FIRST_INTEGRATED_CIRCUIT_T":1528184806314,"R_INDUSTRIAL_ROBOTICS_1":1,"R_INDUSTRIAL_ROBOTICS_1_T":1528184823688,"R_LANGUAGE_1":1,"R_LANGUAGE_1_T":1528184833366,"R_GRAPHICS_0":1,"R_GRAPHICS_0_T":1528184859014,"R_INTEGRATED_CIRCUITS_1":1,"R_INTEGRATED_CIRCUITS_1_T":1528184867830,"R_COMPUTERS_MASS_PRODUCED":1,"R_COMPUTERS_MASS_PRODUCED_T":1528184884842,"R_INTEGRATED_CIRCUITS_2":1,"R_INTEGRATED_CIRCUITS_2_T":1528184906026,"R_INTEGRATED_CIRCUITS_3":1,"R_INTEGRATED_CIRCUITS_3_T":1528184913418,"R_GRAPHICS_1":1,"R_GRAPHICS_1_T":1528184922141,"R_NETWORKING_1":1,"R_NETWORKING_1_T":1528184926093,"R_INTEGRATED_CIRCUITS_4":1,"R_INTEGRATED_CIRCUITS_4_T":1528184934080,"R_MOUSE":1,"R_MOUSE_T":1528184942906,"E_MOUSE_INVENTION":1,"E_MOUSE_INVENTION_T":1528184942909,"R_NETWORKING_2":1,"R_NETWORKING_2_T":1528184943349,"R_EMAIL":1,"R_EMAIL_T":1528184943952,"R_CHAT":1,"R_CHAT_T":1528184944275,"E_PERSONAL_COMPUTING":1,"E_PERSONAL_COMPUTING_T":1528184945514,"R_ML_1":1,"R_ML_1_T":1528184953487,"R_INTERNET":1,"R_INTERNET_T":1528184954276,"R_LANGUAGE_2":1,"R_LANGUAGE_2_T":1528184955619,"E_PERCEPTRONS":1,"E_PERCEPTRONS_T":1528184956037,"E_AI_WINTER":1,"E_AI_WINTER_T":1528184969602,"R_COMPUTER_GAMES_2D":1,"R_COMPUTER_GAMES_2D_T":1528184982627,"R_ML_2":1,"R_ML_2_T":1528185000298,"E_AI_WINTER_END":1,"E_AI_WINTER_END_T":1528185000303,"R_INTEGRATED_CIRCUITS_5":1,"R_INTEGRATED_CIRCUITS_5_T":1528185004497,"R_LANGUAGE_3":1,"R_LANGUAGE_3_T":1528185014221,"R_GRAPHICS_2":1,"R_GRAPHICS_2_T":1528185017757,"R_COMPUTER_GAMES_3D":1,"R_COMPUTER_GAMES_3D_T":1528185028508,"R_GPU_1":1,"R_GPU_1_T":1528185035054}"


$ = $;

const clamp = (x, low, high) => Math.min(high, Math.max(low, x));


const g_speedUpEnabled = true;
const g_speedUp = g_speedUpEnabled ? 2 : 1;
const g_eventSpeedUp = g_speedUpEnabled ? 4 : 1;

const g_initialStateBoost = window.location.search.includes("cheats") ? 100000000000 : 0;

const InitialState = {
    transistors: 0,
    transistorsBuilt: 0,
    computers: Math.min(g_initialStateBoost * 10, 10000),
    computersBuilt: Math.min(g_initialStateBoost * 10, 10000),
    factories: Math.min(g_initialStateBoost * 10, 10000),
    factoriesBuilt: Math.min(g_initialStateBoost * 10, 10000),
    labs: Math.min(g_initialStateBoost * 10, 1000),
    labsBuilt: Math.min(g_initialStateBoost * 10, 1000),
    research: Math.min(g_initialStateBoost * 10, 1000000000),
    researchBuilt: Math.min(g_initialStateBoost * 10, 1000000000),

    integratedCircuits: 0,
    integratedCircuitsBuilt: 0,

    popularity: 0.0,
    popularityLostToUnemployment: 0.0,

    unemployment: 0.0,

    aiWinterPopularityThreshold: Infinity,
    activeEvents: {},

    R_INTEGRATED_CIRCUITS: 0,
};

let OpType = {
    default: 0,
    research: 1,
    event: 2,
}

let g_currentState = { ...InitialState };

const clone = (state) => Object.assign({}, state);

const isResearched = r => g_currentState[r] === 1;
const researchReward = (r, levels, def) => {
    var m = typeof def === 'undefined' ? 1 : def;
    for (var i = 0; i < levels.length; i++) {
        if (g_currentState[r + (i + 1)] === 1) {
            m = levels[i]
        }
    }
    return m;
};

const currentComputeUnits = s => {
    return s.transistors + s.integratedCircuits;
};

const totalComputeUnits = s => {
    return s.transistorsBuilt + s.integratedCircuitsBuilt;
};

class Operator {
    constructor(name) {
        this.name = name;
        this.type = OpType.default;
    }

    description(state) { return ""; }

    prereqs(state) {
        return true;
    }

    permitted(state) {
        return true;
    }

    apply(state) {
        return clone(state);
    }
}

class PurchaseOperator extends Operator {
    constructor(name, prereqs, costs, yields) {
        super(name);

        if (!yields)[costs, yields] = [prereqs, costs];

        this.prereqs_ = typeof (prereqs) === 'function' ? prereqs : (s => prereqs);
        this.costs = typeof (costs) === 'function' ? costs : (s => costs);
        this.yields = typeof (yields) === 'function' ? yields : (s => yields);
    }

    description(state) {
        var from = Object.entries(this.costs(state)).map(([k, v]) => `${k}: ${v}`).join(", ");
        var to = Object.entries(this.yields(state)).map(([k, v]) => `${k}: ${v}`).join(", ");
        return from + " => " + to;
    }

    prereqs(state) {
        for (let [k, v] of Object.entries(this.prereqs_(state))) {
            if (state[k] < v) return false;
        }
        return true;
    }

    permitted(state) {
        for (let [k, v] of Object.entries(this.costs(state))) {
            if (state[k] < v) return false;
        }
        return true;
    }

    apply(state) {
        state = { ...state };
        for (let [k, v] of Object.entries(this.costs(state))) {
            if (k.includes("Built")) continue;
            state[k] -= v;
        }
        for (let [k, v] of Object.entries(this.yields(state))) {
            state[k] += v;
            var builtKey = k + "Built";
            if (builtKey in state) {
                state[builtKey]++;
            }
        }
        return state;
    }
}

class ResearchOperator extends PurchaseOperator {
    constructor(name, prereqs, costs, yields, key, dependencies, cb, timecond) {
        super(name, prereqs, costs, yields);
        this.type = OpType.research

        this.key = key;
        this.dependencies = dependencies;
        this.cb = cb;
        this.timecond = timecond || {};
    }

    availablilityCheck(state) {
        let ok = state[this.key] !== 1;
        for (let dep of this.dependencies) {
            ok = ok && (state[dep] === 1);
        }
        const now = +(new Date());
        for (let [k, v] of Object.entries(this.timecond)) {
            var tkey = k + "_T";
            ok = ok && ((tkey in state) && ((now - state[k + "_T"]) > v));
        }
        return ok;
    }

    prereqs(state) {
        return super.prereqs(state) && this.availablilityCheck(state);
    }

    permitted(state) {
        return super.permitted(state) && this.availablilityCheck(state);
    }

    apply(state) {
        state = super.apply(state);
        state[this.key] = 1;
        state[this.key + "_T"] = +(new Date());
        
        if (this.cb) {
            state = this.cb(state) || state;
        }

        return state;
    }
}

class EventOperator extends ResearchOperator {
    constructor(name, prereqs, key, dependencies, cb, timecond) {
        super(name, prereqs, {}, {}, key, dependencies, cb, timecond);
        this.type = OpType.event;
    }
    
    permitted(state) {
        return super.permitted(state) && super.prereqs(state);
    }
}

var buildTransistor = new PurchaseOperator("Build Transistor", {}, { transistors: 1 });
var buildComputer = new PurchaseOperator("Build Computer", s => (s.R_INTEGRATED_CIRCUITS ? { integratedCircuits: 5 } : { transistors: 10 }), { computers: 1 });
var buildFactory = new PurchaseOperator("Build Factory", s => ({ computers: ~~(5 * (1.3 ** s.factoriesBuilt)) }), { factories: 1 });
var buildLab = new PurchaseOperator("Build Research Lab", s => ({ computers: ~~(10 * (1.5 ** s.labsBuilt)) }), { labs: 1 });

var buildIntegratedCircuit = new PurchaseOperator("Build Integrated Circuit", {R_INTEGRATED_CIRCUITS: 1}, {}, { integratedCircuits: 1 });

allOperators = [];
allOperators.push(buildTransistor);
allOperators.push(buildComputer);
allOperators.push(buildFactory);
allOperators.push(buildLab); 

allOperators.push(buildIntegratedCircuit); 


var researchIntegratedCircuits = new ResearchOperator("Research Integrated Circuits", { research: 20 }, { research: 50 }, {}, 'R_INTEGRATED_CIRCUITS', []);
var upgradeIntegratedCircuits1 = new ResearchOperator("Upgrade Integrated Circuits 1", { research: 100 }, { research: 200 }, {}, 'R_INTEGRATED_CIRCUITS_1', ["R_INTEGRATED_CIRCUITS"]);
var upgradeIntegratedCircuits2 = new ResearchOperator("Upgrade Integrated Circuits 2", {}, { research: 500 }, {}, 'R_INTEGRATED_CIRCUITS_2', ["R_INTEGRATED_CIRCUITS_1"]);
var upgradeIntegratedCircuits3 = new ResearchOperator("Upgrade Integrated Circuits 3", {}, { research: 1000 }, {}, 'R_INTEGRATED_CIRCUITS_3', ["R_INTEGRATED_CIRCUITS_2"]);
var upgradeIntegratedCircuits4 = new ResearchOperator("Upgrade Integrated Circuits 4", {}, { research: 2000 }, {}, 'R_INTEGRATED_CIRCUITS_4', ["R_INTEGRATED_CIRCUITS_3"]);
var upgradeIntegratedCircuits5 = new ResearchOperator("Upgrade Integrated Circuits 5", {}, { research: 10000 }, {}, 'R_INTEGRATED_CIRCUITS_5', ["R_INTEGRATED_CIRCUITS_4"]);
var upgradeIntegratedCircuits6 = new ResearchOperator("Upgrade Integrated Circuits 6", {}, { research: 100000 }, {}, 'R_INTEGRATED_CIRCUITS_6', ["R_INTEGRATED_CIRCUITS_5"]);
var upgradeIntegratedCircuits7 = new ResearchOperator("Upgrade Integrated Circuits 7", {}, { research: 1000000 }, {}, 'R_INTEGRATED_CIRCUITS_7', ["R_INTEGRATED_CIRCUITS_6"]);
var upgradeIntegratedCircuits8 = new ResearchOperator("Upgrade Integrated Circuits 8", {}, { research: 10000000 }, {}, 'R_INTEGRATED_CIRCUITS_8', ["R_INTEGRATED_CIRCUITS_7"]);
var upgradeIntegratedCircuits9 = new ResearchOperator("Upgrade Integrated Circuits 9", {}, { research: 100000000 }, {}, 'R_INTEGRATED_CIRCUITS_9', ["R_INTEGRATED_CIRCUITS_8"]);
var upgradeIntegratedCircuits10 = new ResearchOperator("Upgrade Integrated Circuits 10", {}, { research: 1000000000 }, {}, 'R_INTEGRATED_CIRCUITS_10', ["R_INTEGRATED_CIRCUITS_9"]); // 1 billion
allOperators.push(researchIntegratedCircuits);
allOperators.push(upgradeIntegratedCircuits1);
allOperators.push(upgradeIntegratedCircuits2);
allOperators.push(upgradeIntegratedCircuits3);
allOperators.push(upgradeIntegratedCircuits4);
allOperators.push(upgradeIntegratedCircuits5);
allOperators.push(upgradeIntegratedCircuits6);
allOperators.push(upgradeIntegratedCircuits7);
allOperators.push(upgradeIntegratedCircuits8);
allOperators.push(upgradeIntegratedCircuits9);
allOperators.push(upgradeIntegratedCircuits10);

var researchLanguage1 = new ResearchOperator("Research Language 1", { labs: 5 }, { research: 100 }, {}, 'R_LANGUAGE_1', []); // ASM
var researchLanguage2 = new ResearchOperator("Research Language 2", {}, { research: 1000 }, {}, 'R_LANGUAGE_2', ['R_LANGUAGE_1']); // Low-level
var researchLanguage3 = new ResearchOperator("Research Language 3", {}, { research: 10000 }, {}, 'R_LANGUAGE_3', ['R_LANGUAGE_2']); // C
var researchLanguage4 = new ResearchOperator("Research Language 4", {}, { research: 100000 }, {}, 'R_LANGUAGE_4', ['R_LANGUAGE_3']); 
var researchLanguage5 = new ResearchOperator("Research Language 5", {}, { research: 1000000 }, {}, 'R_LANGUAGE_5', ['R_LANGUAGE_4']); // Python
allOperators.push(researchLanguage1);
allOperators.push(researchLanguage2);
allOperators.push(researchLanguage3);
allOperators.push(researchLanguage4);
allOperators.push(researchLanguage5);

var industrialRobotics1 = new ResearchOperator("Industrial Robotics", { factoriesBuilt: 5 }, { factoriesBuilt: 10, research: 100 }, {}, 'R_INDUSTRIAL_ROBOTICS_1', ['R_INTEGRATED_CIRCUITS']);
var industrialRobotics2 = new ResearchOperator("Direct Drive Arm", {}, { research: 1000 }, {}, 'R_INDUSTRIAL_ROBOTICS_2', ['R_INDUSTRIAL_ROBOTICS_1']);
var industrialRobotics3 = new ResearchOperator("ML Robots", {}, { research: 100000000 }, {}, 'R_INDUSTRIAL_ROBOTICS_3', ['R_INDUSTRIAL_ROBOTICS_2', 'R_ML_3']);
allOperators.push(industrialRobotics1);
allOperators.push(industrialRobotics2);
allOperators.push(industrialRobotics3);

var machineLearning1 = new ResearchOperator("Machine Learning I", { research: 500 }, { research: 1000 }, {}, 'R_ML_1', []);
var machineLearning2 = new ResearchOperator("Machine Learning II (backprop)", { labsBuilt: 5 }, { labsBuilt: 15, research: 5000 }, {}, 'R_ML_2', ['R_ML_1'], null, { 'E_AI_WINTER': 10000 / g_eventSpeedUp });
var machineLearning3 = new ResearchOperator("Machine Learning III (CNNs)", {}, { research: 2000000 }, {}, 'R_ML_3', ['R_ML_2', 'R_GPU_3']);
var machineLearning4 = new ResearchOperator("Machine Learning IV (Near Future)", {}, { research: 5000000 }, {}, 'R_ML_4', ['R_ML_3']);
var machineLearning5 = new ResearchOperator("Machine Learning V (Far Future)", {}, { research: 75000000 }, {}, 'R_ML_5', ['R_ML_4', 'R_GPU_4']);
allOperators.push(machineLearning1);
allOperators.push(machineLearning2);
allOperators.push(machineLearning3);
allOperators.push(machineLearning4);
allOperators.push(machineLearning5);

var graphics0 = new ResearchOperator("Text-based User Interfaces", { research: 100 }, { research: 200 }, {}, 'R_GRAPHICS_0', ['R_LANGUAGE_1']);
var graphics1 = new ResearchOperator("Graphical User Interfaces", { research: 1000 }, { research: 1500 }, {}, 'R_GRAPHICS_1', ['R_GRAPHICS_0']);
var graphics2 = new ResearchOperator("3D Graphics", {}, { research: 10000 }, {}, 'R_GRAPHICS_2', ['R_GRAPHICS_1']);
var graphicsFirstMice = new ResearchOperator("The Mouse", { research: 2000 }, { research: 2500 }, {}, 'R_MOUSE', ['R_GRAPHICS_1']);

var networking1 = new ResearchOperator("Networks", { research: 500 }, { research: 1000 }, {}, 'R_NETWORKING_1', ['R_LANGUAGE_1']);
var networking2 = new ResearchOperator("The Internet", { research: 1000 }, { research: 1500 }, {}, 'R_NETWORKING_2', ['R_NETWORKING_1']);
var email = new ResearchOperator("Email", { research: 100 }, { research: 200 }, {}, 'R_EMAIL', ['R_GRAPHICS_0', 'R_NETWORKING_2'], handleAddPopularityFactory(1));
var instantMessaging = new ResearchOperator("Instant Messaging", { research: 200 }, { research: 400 }, {}, 'R_CHAT', ['R_GRAPHICS_0', 'R_NETWORKING_2'], handleAddPopularityFactory(1));

var eventInventionOfMouse = new EventOperator("The Invention of the Mouse", { }, 'E_MOUSE_INVENTION', ['R_MOUSE'], () => showNotification('E_MOUSE_INVENTED'), { });
var eventPersonalComputing = new EventOperator("Personal Computing", { }, 'E_PERSONAL_COMPUTING', ['E_MOUSE_INVENTION', 'R_COMPUTERS_MASS_PRODUCED'], handlePersonalComputing, { E_MOUSE_INVENTION: 10000 / g_eventSpeedUp });

var browsers = new ResearchOperator("Web Browsers", { research: 1500 }, { research: 2500 }, {}, 'R_INTERNET', ['R_GRAPHICS_1', 'R_NETWORKING_2', 'E_PERSONAL_COMPUTING'], handleAddPopularityFactory(1));

var research2DGames = new ResearchOperator("Research 2D Computer Games", { }, { research: 5000 }, {}, 'R_COMPUTER_GAMES_2D', ['E_PERSONAL_COMPUTING'], handleResearch2DGames);
var research3DGames = new ResearchOperator("Research 3D Computer Games", { research: 10000 }, { research: 15000 }, {}, 'R_COMPUTER_GAMES_3D', ['R_COMPUTER_GAMES_2D', 'R_GRAPHICS_2'], handleResearch3DGames);

var gpu1 = new ResearchOperator("GPUs I", { research: 10000 }, { research: 15000  }, {}, 'R_GPU_1', ['R_COMPUTER_GAMES_2D']); //90s GPUs
var gpu2 = new ResearchOperator("GPUs II", { research: 100000 }, { research: 150000 }, {}, 'R_GPU_2', ['R_GPU_1']); // 2000's GPUs
var gpu3 = new ResearchOperator("GPUs III", { research: 1000000 }, { research: 1500000 }, {}, 'R_GPU_3', ['R_GPU_2']); // modern GPUs & compute
var gpu4 = new ResearchOperator("GPUs IV", { research: 10000000 }, { research: 50000000 }, {}, 'R_GPU_4', ['R_GPU_3']); // future GPUs
var virtualReality = new ResearchOperator("Virtual Reality", { research: 1000000 }, { research: 2000000 }, {}, 'R_VR', ['R_GPU_3'], handleResearchVirtualReality);
var augmentedReality = new ResearchOperator("Augmented Reality", { }, { research: 10000000 }, {}, 'R_AR', ['R_VR'], handleAddPopularityFactory(5));

var iot = new ResearchOperator("Internet of Things", { research: 1000000 }, { research: 10000000 }, {}, 'R_IOT', ['R_ML_3', 'R_NETWORKING_2'], handleAddPopularityFactory(5));

allOperators.push(graphics0);
allOperators.push(graphics1);
allOperators.push(graphics2);
allOperators.push(graphicsFirstMice);

allOperators.push(networking1);
allOperators.push(networking2);
allOperators.push(email);
allOperators.push(instantMessaging);

allOperators.push(eventInventionOfMouse);
allOperators.push(eventPersonalComputing);

allOperators.push(browsers);

allOperators.push(research2DGames);
allOperators.push(research3DGames);
allOperators.push(gpu1);
allOperators.push(gpu2);
allOperators.push(gpu3);
allOperators.push(gpu4);
allOperators.push(virtualReality);
allOperators.push(augmentedReality);

allOperators.push(iot);

function handleAddPopularityFactory(n) {
    return state => {
        state.popularity += computePopularityDeltaScale(g_currentState, n);
    };
}

function handleResearch2DGames(state) {
    state.popularity += computePopularityDeltaScale(g_currentState, 1);
}

function handleResearch3DGames(state) {
    state.popularity += computePopularityDeltaScale(g_currentState, 1);
}

function handleResearchVirtualReality(state) {
    state.popularity += computePopularityDeltaScale(g_currentState, 1);
}

var computersMassProduced = new ResearchOperator("Computers Mass Produced", { research: 300 }, { research: 500 }, {}, 'R_COMPUTERS_MASS_PRODUCED', ['R_INDUSTRIAL_ROBOTICS_1']);
allOperators.push(computersMassProduced);

// EVENTS s => ({ popularity: s.aiWinterPopularityThreshold })
var perceptrons = new EventOperator("Perceptrons", {}, 'E_PERCEPTRONS', ['R_ML_1'], handlePerceptrons, { 'R_ML_1': 10000 / g_eventSpeedUp });
var aiWinter = new EventOperator("AI Winter", { research: 10000 }, 'E_AI_WINTER', ['E_PERCEPTRONS'], handleAiWinter, { 'E_PERCEPTRONS': 10000 / g_eventSpeedUp });
var aiWinterEnd = new EventOperator("AI Winter End", {}, 'E_AI_WINTER_END', ['E_AI_WINTER', 'R_ML_2'], handleAiWinterEnd, {});

function handlePerceptrons() {
    showNotification('E_PERCEPTRON_NOTIFICATION');
}

function handleAiWinter(state) {
    showNotification('E_AI_WINTER');

    state.activeEvents.aiWinter = {
        researchMultiplier: 2,
        researchRate: 0.75,
    };

    state.aiWinterPopularityThreshold = state.popularity;
    state.popularity -= 10;

    return state;
}

function handleAiWinterEnd(state) {
    showNotification('E_AI_WINTER_END');
    delete state.activeEvents.aiWinter;
}


allOperators.push(perceptrons);
allOperators.push(aiWinter);
allOperators.push(aiWinterEnd);

var eventFirstTransistor = new EventOperator("First Transistor", { transistorsBuilt: 1 }, 'E_FIRST_TRANSISTOR', [], () => showNotification('E_FIRST_TRANSISTOR'), { });
var eventFirstComputer = new EventOperator("First Computer", { computersBuilt: 1 }, 'E_FIRST_COMPUTER', [], () => showNotification('E_FIRST_COMPUTER'), { });
var eventFirstIntegratedCircuit = new EventOperator("First Integrated Circuit", { integratedCircuitsBuilt: 1 }, 'E_FIRST_INTEGRATED_CIRCUIT', [], () => showNotification('E_FIRST_INTEGRATED_CIRCUIT'), { });
allOperators.push(eventFirstTransistor);
allOperators.push(eventFirstComputer);
allOperators.push(eventFirstIntegratedCircuit);

function handlePersonalComputing(state) {
    showNotification('E_PERSONAL_COMPUTING');
    state.popularity += computePopularityDeltaScale(g_currentState, 2);
}

var eventReeducation = new EventOperator("Reeducation Available", { unemployment: 10000 }, 'E_REEDUCATION_AVAILABLE', [], () => showNotification('E_REEDUCATION_AVAILABLE'), { });
var researchReeducation = new ResearchOperator("Reeducation", {}, { research: 50000 }, {}, 'R_REEDUCATION', ['E_REEDUCATION_AVAILABLE']);
allOperators.push(eventReeducation);
allOperators.push(researchReeducation);

//-----------------------------------------------------------------------------
// User Interface
//-----------------------------------------------------------------------------
g_statusUi = $("<h1></h1>");
g_debugStatusUi = $("<h1 style='font-size: 20px'></h1>");
g_computeUnitSliderHost = $("#computeUnitSliderHost");
g_transistorsVsComputersSlider = $("#computeUnitSlider");
g_researchVsReeducationSliderHost = $("#reeducationSliderHost");
g_researchVsReeducationSlider = $("#reeducationSlider");

function setupInterface() {
    $('.notification-template').hide();
    $('#status-host').append(g_statusUi);
    $('#debug-status-host').append(g_debugStatusUi);
    g_computeUnitSliderHost.hide();
    g_researchVsReeducationSliderHost.hide();

    for (let operator of allOperators) {
        var button = $("<button>");
        button.click(() => handleOperatorClicked(operator));
        button.hide();

        $("#control-host").append(button);
        operator.button = button;
    }
}

function updateInterface() {
    var json = "{ " + Object.entries(g_currentState).map(([k, v]) => k + ": " + (typeof v === 'number' ? v.toFixed(1) : '[object]')).join(", ") + " }";
    g_debugStatusUi.text(json);

    var text = [
        [Math.floor(g_currentState.transistors + g_currentState.integratedCircuits) + " Units", true],
        [Math.floor(g_currentState.computers) + " Computers", g_currentState.computersBuilt > 0],
        [Math.floor(g_currentState.factories) + " Factories", g_currentState.factoriesBuilt > 0],
        [Math.floor(g_currentState.labs) + " Labs", g_currentState.labsBuilt > 0],
        [Math.floor(g_currentState.research) + " Research", g_currentState.labsBuilt > 0],
        [Math.floor(g_currentState.popularity) + " Popularity", true],
        [Math.floor(g_currentState.unemployment) + " Unemployment", true],
    ].filter(([t, ok]) => ok).map(([t, ok]) => t).join("<br/>")
    g_statusUi.html(text)

    for (let operator of allOperators) {
        if (operator.prereqs(g_currentState)) {
            operator.button.show();
        }

        var permitted = operator.permitted(g_currentState);
        operator.button.prop("disabled", !permitted);

        if (permitted && operator.type === OpType.event) {
            operator.button.click();
        }

        var opcontent = operator.name;
        var opdesc = operator.description(g_currentState);
        if (opdesc) opcontent += "<br/>(" + opdesc + ")";
        operator.button.html(opcontent);
    }
    
    if (isResearched('R_COMPUTERS_MASS_PRODUCED')) {
        g_computeUnitSliderHost.show();
    }

    if (isResearched('R_REEDUCATION')) {
        g_researchVsReeducationSliderHost.show();
    }
}

function showNotification(el) {
    const notif = $("#" + el);
    notif.show();
    $("#sidebar").prepend(notif);
}

function computePopularityDeltaScale(s, x) {
    if (x === undefined) throw "arg 2 probably missing";
    return x * Math.log(totalComputeUnits(s) + 2); // 2 so tests fine if at 0 transistors
}

function handleOperatorClicked(operator) {
    if (operator.permitted(g_currentState)) {
        g_currentState = operator.apply(g_currentState);
        console.log(g_currentState);

        if (operator.type === OpType.research || operator.type === OpType.event) {
            operator.button.remove();
        }

        // HACK: Research ICs replaces transistors w/ ICs.
        if (operator === researchIntegratedCircuits) {
            buildTransistor.button.remove();
            g_currentState.integratedCircuits = g_currentState.transistors;
            g_currentState.transistors = 0;
        }

        // HACK: Rapidly building factories increases unemployment.
        if (operator === buildFactory) {
            // const now = +(new Date());
            // const timeSinceLast = now - g_currentState.factoriesBuiltLastTime;
            const unemploymentDeltaMultiplier = researchReward('R_INDUSTRIAL_ROBOTICS_', [5, 30, 500], 0);
            const unemploymentChange = 10 * unemploymentDeltaMultiplier * (1.04 ** g_currentState.factoriesBuilt);
            g_currentState.unemployment += unemploymentChange;
        }

        // HACK: Building research lab decreases unemployment by 1
        if (operator === buildLab) {
            g_currentState.unemployment = clamp(g_currentState.unemployment, 0, Infinity);
        }

        // Events
        if (operator === buildComputer && g_currentState.computersBuilt === 1) {
            g_currentState.popularity += computePopularityDeltaScale(g_currentState, 1);
        }

        // AI Winter
        // on ML_1 && research 10000, AI Winter

        updateInterface();
    }
}

let backgroundIntervalSeconds = 0.1;
function backgroundTick() {
    g_currentState = { ...g_currentState };

    var workUnitsBase = g_currentState.factories * backgroundIntervalSeconds * 5 * g_speedUp;

    if (!g_currentState.R_INTEGRATED_CIRCUITS) {
        g_currentState.transistors += workUnitsBase;
        g_currentState.transistorsBuilt += workUnitsBase;
    } else {
        var roboticsMultiplier = researchReward('R_INDUSTRIAL_ROBOTICS_', [2, 5, 10], 1);
        var mlPower = researchReward('R_ML_', [2, 3, 4, 5], 1);

        var percentComputerEffort = ~~(g_transistorsVsComputersSlider.val()) / 100;
        var percentTransistorEffort = 1 - percentComputerEffort;

        const workUnitsTransformed = ((roboticsMultiplier) ** mlPower) * workUnitsBase;

        // Transistors
        var buildIcOps = workUnitsTransformed * percentTransistorEffort;
        g_currentState.integratedCircuits += buildIcOps;
        g_currentState.integratedCircuitsBuilt += buildIcOps;

        // Computers
        const maxBuildComputerOps = workUnitsTransformed * percentComputerEffort;
        const costIc = buildComputer.costs(g_currentState).integratedCircuits;
        const yieldsComputers = buildComputer.yields(g_currentState).computers;
        const buildComputerOps = Math.min(maxBuildComputerOps, g_currentState.integratedCircuits / costIc);
        console.log(buildIcOps, workUnitsTransformed, percentTransistorEffort, "!!!", maxBuildComputerOps, costIc, yieldsComputers, buildComputerOps)
        g_currentState.integratedCircuits -= buildComputerOps * costIc;
        g_currentState.computers += buildComputerOps * yieldsComputers;
    }


    if (true) { // research lab => research
        var languageUpgradeMultipliers = [1.1, 1.2, 1.3, 1.4, 1.5];
        var languageUpgradeMultiplier = 1;
        for (var i = 0; i < languageUpgradeMultipliers.length; i++) {
            if (g_currentState["R_LANGUAGE_" + (i + 1)] === 1) {
                languageUpgradeMultiplier = languageUpgradeMultipliers[i];
            }
        }

        var researchLabOutputs = [2, 5, 10, 20, 50, 100, 500, 1500, 3000, 5000];
        var icUpgradeMultiplier = 1;
        for (var i = 0; i < researchLabOutputs.length; i++) {
            if (g_currentState["R_INTEGRATED_CIRCUITS_" + (i + 1)] === 1) {
                icUpgradeMultiplier = researchLabOutputs[i];
            }
        }

        var mouseMultiplier = isResearched('R_MOUSE') ? 1.1 : 1;

        var dresearchbase = g_currentState.labs * backgroundIntervalSeconds * icUpgradeMultiplier * mouseMultiplier * g_speedUp;
        var percentToReeducation = (~~(g_researchVsReeducationSlider.val()) / 100);
        
        var dresearchspent = Math.min(2 * dresearchbase * percentToReeducation, g_currentState.research)

        g_currentState.research += dresearchbase - dresearchspent;
        g_currentState.researchBuilt += dresearchbase - dresearchspent;
        
        var dunemployment = Math.max(0.125 * dresearchspent, 0);
        g_currentState.unemployment -= dunemployment;
    }

    for (var i = 0; i < g_speedUp; i++) {
        if (g_currentState.unemployment > 0) {
            g_currentState.unemployment -= 0.1 * Math.pow(g_currentState.unemployment + 1, 0.5) * backgroundIntervalSeconds;
            g_currentState.unemployment = clamp(g_currentState.unemployment, 0, Infinity);
        }

        if (g_currentState.unemployment > 10000) {
            let popularityLost = computePopularityDeltaScale(g_currentState, 0.03) * backgroundIntervalSeconds;
            g_currentState.popularity -= popularityLost;
            g_currentState.popularityLostToUnemployment += popularityLost;
        }

        if (g_currentState.unemployment < 7500) {
            let popularityRecovered = computePopularityDeltaScale(g_currentState, 0.05) * backgroundIntervalSeconds;
            popularityRecovered = Math.min(
                popularityRecovered,
                g_currentState.popularityLostToUnemployment);

            g_currentState.popularity += popularityRecovered;
            g_currentState.popularityLostToUnemployment -= popularityRecovered;
        }
    }

    if (isResearched("R_COMPUTERS_MASS_PRODUCED")) {
//        g_currentState
    }

    updateInterface();

    setTimeout(backgroundTick, backgroundIntervalSeconds * 1000);
}


function main() {
    setupInterface();
    updateInterface();
    backgroundTick();
}

window.onload = main;