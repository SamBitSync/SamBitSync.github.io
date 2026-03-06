export type DomainKey = 'systems' | 'tools' | 'patterns' | 'courses' | 'library' | 'uncategorized';

export interface DomainDef {
    label: string;
    subtitle: string;
}

export const DOMAINS: Record<DomainKey, DomainDef> = {
    systems: {
        label: "Systems and Substrates",
        subtitle: "What has the mechanism"
    },
    tools: {
        label: "Tools and Techniques",
        subtitle: "How you probe it"
    },
    patterns: {
        label: "Patterns Which Connect",
        subtitle: "Vocabulary across substrates"
    },
    courses: {
        label: "Curriculum",
        subtitle: "University courses, MOOCs, and assigned readings"
    },
    library: {
        label: "Library",
        subtitle: "Books, papers, and research materials"
    },
    uncategorized: {
        label: "Uncategorized Projects",
        subtitle: "New or unsorted work"
    }
};


export interface TopicDef {
    title: string;
    description: string;
    domain: DomainKey;
    status?: 'active' | 'planned' | 'completed';
    layout?: 'grid' | 'timeline';
}

// Map project slugs (normalized) to topic definitions
export const TOPIC_TAXONOMY: Record<string, TopicDef> = {
    // Systems
    "trilingual-minds": {
        title: "Trilingual Minds",
        description: "Cognitive processing in multilingual systems.",
        domain: "systems"
    },
    "phonology": {
        title: "Phonology",
        description: "Sound systems and structure.",
        domain: "systems"
    },
    "attention": {
        title: "Attention",
        description: "Selection mechanisms in cognition.",
        domain: "systems"
    },
    "binding-problem": {
        title: "Binding Problem",
        description: "Integration of distributed features.",
        domain: "systems"
    },
    "generative-models": {
        title: "Generative Models",
        description: "Generation and synthesis mechanisms.",
        domain: "systems"
    },
    "predictive-processing": {
        title: "Predictive Processing",
        description: "Brain as a prediction machine.",
        domain: "systems"
    },
    "control-theory": {
        title: "Control Theory",
        description: "Feedback and regulation systems.",
        domain: "systems"
    },
    "scientific-communities": {
        title: "Scientific Communities",
        description: "Institutions as cognitive systems.",
        domain: "systems"
    },
    "language-acquisition": {
        title: "Language Acquisition",
        description: "Learning linguistic systems.",
        domain: "systems"
    },

    // Tools
    "eyetracking": {
        title: "Eyetracking Series",
        description: "From raw coordinates to cognitive states.",
        domain: "tools"
    },
    "mousetracking": {
        title: "Mousetracking",
        description: "Continuous dynamics of decision making.",
        domain: "tools"
    },
    "building-cognitive-experiments": {
        title: "Building Cognitive Experiments",
        description: "Design and implementation of robust tasks.",
        domain: "tools"
    },
    "signal-processing": {
        title: "Signal Processing",
        description: "Analysis of neural and behavioral time-series.",
        domain: "tools"
    },
    "bayesian-statistics": {
        title: "Bayesian Statistics Series",
        description: "Moving from 'statistics as formulas' to 'statistics as counting at scale'.",
        domain: "tools"
    },
    "causation": {
        title: "Causation",
        description: "From correlation to mechanism.",
        domain: "tools"
    },
    "sts": {
        title: "STS and Ethnography",
        description: "Science and Technology Studies methods.",
        domain: "tools"
    },
    "explanatory-depth": {
        title: "Explanatory Depth",
        description: "From description to understanding.",
        domain: "tools"
    },
    "computational-cognitive-science": {
        title: "Computational Cognitive Science",
        description: "From verbal theories to formal models.",
        domain: "tools"
    },
    "mechanistic-interpretability": {
        title: "Mechanistic Interpretability",
        description: "Reverse engineering neural networks.",
        domain: "tools"
    },

    // Patterns
    "strange-loops": {
        title: "Strange Loops",
        description: "Tangled hierarchies and self-reference.",
        domain: "patterns"
    },
    "computation-as-dynamics": {
        title: "Computation as Dynamics",
        description: "Neural systems as dynamical systems.",
        domain: "patterns"
    },
    "learning-as-optimization": {
        title: "Learning as Optimization",
        description: "Gradient descent and loss landscapes.",
        domain: "patterns"
    },
    "representation-spaces": {
        title: "Representation Spaces",
        description: "Geometry of high-dimensional features.",
        domain: "patterns"
    },
    "information-theory": {
        title: "Information Theory",
        description: "Quantifying uncertainty and transmission.",
        domain: "patterns"
    },
    "algorithmic-information": {
        title: "Algorithmic Information",
        description: "Compression and complexity.",
        domain: "patterns"
    },
    "geometric-deep-learning": {
        title: "Geometric Deep Learning",
        description: "Symmetry, structure, and neural architectures.",
        domain: "patterns"
    },
    "compression-as-intelligence": {
        title: "Compression as Intelligence",
        description: "From algorithms to AGI.",
        domain: "patterns"
    },
    "neuroai": {
        title: "NeuroAI",
        description: "When brains meet artificial networks.",
        domain: "patterns"
    },
    "beyond-folk-psychology": {
        title: "Beyond Folk Psychology",
        description: "Mechanisms and meanings.",
        domain: "patterns"
    },

    // Curriculum (Courses & Readings)
    "moocs": {
        title: "MOOCs",
        description: "Online courses and structured learning tracks.",
        domain: "courses",
        layout: "grid"
    },
    "course-work": {
        title: "Course Work",
        description: "University coursework and academic process groups.",
        domain: "courses",
        layout: "grid"
    },
    "readings": {
        title: "Readings",
        description: "Assigned lab readings and papers.",
        domain: "library",
        layout: "timeline"
    },
    "books": {
        title: "Books",
        description: "Deep reading and synthesis projects.",
        domain: "library",
        layout: "grid"
    }
};

export function getTopicInfo(slug: string): TopicDef {
    const normalizedSlug = slug.toLowerCase().replace(/\s+/g, '-');
    return TOPIC_TAXONOMY[normalizedSlug] || {
        title: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        description: "Ongoing research project.",
        domain: "uncategorized",
        status: "active"
    };
}
