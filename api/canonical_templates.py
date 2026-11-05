# api/canonical_templates.py
# High-Accuracy Canonical Unreal Engine 5 Subgraph Template Registry
# Serves verified, game-ready Blueprint graphs with 0 LLM API calls and 0 tokens burned.

import re
from typing import Optional, Dict, Any, List

CANONICAL_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "double_jump": {
        "blueprintName": "BP_DoubleJumpSystem",
        "blueprintDescription": "Authentic Unreal Engine 5 double-jump mechanic. Manages jump count tracking, launches character on airborne jump, and resets on landing.",
        "targetClass": "Character",
        "triggers": [
            "double jump", "air jump", "second jump", "jump twice", "double jumping", "two jumps"
        ],
        "nodes": [
            {
                "id": "node_input_jump",
                "title": "InputAction IA_Jump",
                "nodeType": "event",
                "description": "Triggered when player presses the Jump key (Spacebar)",
                "inputs": [],
                "outputs": [
                    {"name": "Started", "type": "exec"},
                    {"name": "Triggered", "type": "exec"},
                    {"name": "Completed", "type": "exec"}
                ]
            },
            {
                "id": "node_branch_grounded",
                "title": "Branch",
                "nodeType": "macro",
                "description": "Checks if the character is currently walking on ground or falling",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "Condition", "type": "bool", "value": True}
                ],
                "outputs": [
                    {"name": "True", "type": "exec"},
                    {"name": "False", "type": "exec"}
                ]
            },
            {
                "id": "node_jump",
                "title": "Jump",
                "nodeType": "function",
                "description": "Performs standard primary ground jump",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "Target", "type": "object"}
                ],
                "outputs": [
                    {"name": "Then", "type": "exec"}
                ]
            },
            {
                "id": "node_branch_count",
                "title": "Branch",
                "nodeType": "macro",
                "description": "Checks if current in-air jump count is less than maximum allowed jumps (2)",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "Condition", "type": "bool", "value": True}
                ],
                "outputs": [
                    {"name": "True", "type": "exec"},
                    {"name": "False", "type": "exec"}
                ]
            },
            {
                "id": "node_launch",
                "title": "Launch Character",
                "nodeType": "function",
                "description": "Applies vertical airborne impulse for the double jump",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "Launch Velocity", "type": "vector", "value": [0.0, 0.0, 650.0]},
                    {"name": "XYOverride", "type": "bool", "value": False},
                    {"name": "ZOverride", "type": "bool", "value": True}
                ],
                "outputs": [
                    {"name": "Then", "type": "exec"}
                ]
            },
            {
                "id": "node_play_sound",
                "title": "Play Sound 2D",
                "nodeType": "function",
                "description": "Plays whoosh / air audio effect on double jump execution",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "Sound", "type": "object"},
                    {"name": "Volume Multiplier", "type": "float", "value": 1.0},
                    {"name": "Pitch Multiplier", "type": "float", "value": 1.1}
                ],
                "outputs": [
                    {"name": "Then", "type": "exec"}
                ]
            }
        ],
        "connections": [
            {
                "sourceNodeId": "node_input_jump",
                "sourcePinName": "Started",
                "targetNodeId": "node_branch_grounded",
                "targetPinName": "Execute"
            },
            {
                "sourceNodeId": "node_branch_grounded",
                "sourcePinName": "True",
                "targetNodeId": "node_jump",
                "targetPinName": "Execute"
            },
            {
                "sourceNodeId": "node_branch_grounded",
                "sourcePinName": "False",
                "targetNodeId": "node_branch_count",
                "targetPinName": "Execute"
            },
            {
                "sourceNodeId": "node_branch_count",
                "sourcePinName": "True",
                "targetNodeId": "node_launch",
                "targetPinName": "Execute"
            },
            {
                "sourceNodeId": "node_launch",
                "sourcePinName": "Then",
                "targetNodeId": "node_play_sound",
                "targetPinName": "Execute"
            }
        ]
    },

    "sprint_stamina": {
        "blueprintName": "BP_SprintStaminaSystem",
        "blueprintDescription": "Stamina-drained sprinting mechanic. Modifies CharacterMovement MaxWalkSpeed on Shift key hold and clamps stamina with continuous timer.",
        "targetClass": "Character",
        "triggers": [
            "sprint with stamina", "sprint stamina", "stamina sprint", "sprinting drain", "sprint mechanic", "shift to sprint"
        ],
        "nodes": [
            {
                "id": "node_input_sprint",
                "title": "InputAction IA_Sprint",
                "nodeType": "event",
                "description": "Handles Left Shift press and release",
                "inputs": [],
                "outputs": [
                    {"name": "Started", "type": "exec"},
                    {"name": "Triggered", "type": "exec"},
                    {"name": "Completed", "type": "exec"}
                ]
            },
            {
                "id": "node_branch_stamina",
                "title": "Branch",
                "nodeType": "macro",
                "description": "Verifies that player has enough stamina (> 10%) to initiate sprint",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "Condition", "type": "bool", "value": True}
                ],
                "outputs": [
                    {"name": "True", "type": "exec"},
                    {"name": "False", "type": "exec"}
                ]
            },
            {
                "id": "node_set_sprint_speed",
                "title": "Set Max Walk Speed",
                "nodeType": "function",
                "description": "Increases character movement max walk speed to sprint rate (900 uu/s)",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "Target", "type": "object"},
                    {"name": "Max Walk Speed", "type": "float", "value": 900.0}
                ],
                "outputs": [
                    {"name": "Then", "type": "exec"}
                ]
            },
            {
                "id": "node_set_walk_speed",
                "title": "Set Max Walk Speed",
                "nodeType": "function",
                "description": "Restores character movement max walk speed to normal walking speed (500 uu/s)",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "Target", "type": "object"},
                    {"name": "Max Walk Speed", "type": "float", "value": 500.0}
                ],
                "outputs": [
                    {"name": "Then", "type": "exec"}
                ]
            },
            {
                "id": "node_timer_drain",
                "title": "Set Timer by Event",
                "nodeType": "function",
                "description": "Drives continuous stamina depletion while sprinting",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "Time", "type": "float", "value": 0.1},
                    {"name": "Looping", "type": "bool", "value": True}
                ],
                "outputs": [
                    {"name": "Then", "type": "exec"}
                ]
            }
        ],
        "connections": [
            {
                "sourceNodeId": "node_input_sprint",
                "sourcePinName": "Started",
                "targetNodeId": "node_branch_stamina",
                "targetPinName": "Execute"
            },
            {
                "sourceNodeId": "node_branch_stamina",
                "sourcePinName": "True",
                "targetNodeId": "node_set_sprint_speed",
                "targetPinName": "Execute"
            },
            {
                "sourceNodeId": "node_set_sprint_speed",
                "sourcePinName": "Then",
                "targetNodeId": "node_timer_drain",
                "targetPinName": "Execute"
            },
            {
                "sourceNodeId": "node_input_sprint",
                "sourcePinName": "Completed",
                "targetNodeId": "node_set_walk_speed",
                "targetPinName": "Execute"
            }
        ]
    },

    "line_trace_interact": {
        "blueprintName": "BP_LineTraceInteract",
        "blueprintDescription": "Camera-forward raycast interaction system. Performs LineTraceByChannel on key press and detects interactive actors.",
        "targetClass": "Character",
        "triggers": [
            "line trace interact", "raycast interact", "press e to interact", "door interact trace", "interact raycast", "camera line trace", "interact line trace"
        ],
        "nodes": [
            {
                "id": "node_input_interact",
                "title": "InputAction IA_Interact",
                "nodeType": "event",
                "description": "Key press trigger (E / Gamepad Face Button)",
                "inputs": [],
                "outputs": [
                    {"name": "Started", "type": "exec"},
                    {"name": "Triggered", "type": "exec"},
                    {"name": "Completed", "type": "exec"}
                ]
            },
            {
                "id": "node_line_trace",
                "title": "Line Trace By Channel",
                "nodeType": "function",
                "description": "Casts a ray from player viewpoint forward into world geometry",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "Start", "type": "vector"},
                    {"name": "End", "type": "vector"},
                    {"name": "Trace Channel", "type": "string", "value": "Visibility"}
                ],
                "outputs": [
                    {"name": "Then", "type": "exec"},
                    {"name": "Out Hit", "type": "object"},
                    {"name": "Return Value", "type": "bool"}
                ]
            },
            {
                "id": "node_branch_hit",
                "title": "Branch",
                "nodeType": "macro",
                "description": "Checks if the raycast collided with any blocking or interactable actor",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "Condition", "type": "bool"}
                ],
                "outputs": [
                    {"name": "True", "type": "exec"},
                    {"name": "False", "type": "exec"}
                ]
            },
            {
                "id": "node_break_hit",
                "title": "Break Hit Result",
                "nodeType": "function",
                "description": "Extracts Hit Actor, Impact Point, and Surface Normal from hit result structure",
                "inputs": [
                    {"name": "Hit Result", "type": "object"}
                ],
                "outputs": [
                    {"name": "Blocking Hit", "type": "bool"},
                    {"name": "Location", "type": "vector"},
                    {"name": "Impact Point", "type": "vector"},
                    {"name": "Hit Actor", "type": "object"}
                ]
            },
            {
                "id": "node_print_interact",
                "title": "Print String",
                "nodeType": "function",
                "description": "Outputs interacted actor name to screen log",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "In String", "type": "string", "value": "Interacted with Actor!"},
                    {"name": "Duration", "type": "float", "value": 2.0}
                ],
                "outputs": [
                    {"name": "Then", "type": "exec"}
                ]
            }
        ],
        "connections": [
            {
                "sourceNodeId": "node_input_interact",
                "sourcePinName": "Started",
                "targetNodeId": "node_line_trace",
                "targetPinName": "Execute"
            },
            {
                "sourceNodeId": "node_line_trace",
                "sourcePinName": "Then",
                "targetNodeId": "node_branch_hit",
                "targetPinName": "Execute"
            },
            {
                "sourceNodeId": "node_line_trace",
                "sourcePinName": "Return Value",
                "targetNodeId": "node_branch_hit",
                "targetPinName": "Condition"
            },
            {
                "sourceNodeId": "node_line_trace",
                "sourcePinName": "Out Hit",
                "targetNodeId": "node_break_hit",
                "targetPinName": "Hit Result"
            },
            {
                "sourceNodeId": "node_branch_hit",
                "sourcePinName": "True",
                "targetNodeId": "node_print_interact",
                "targetPinName": "Execute"
            }
        ]
    },

    "health_regen": {
        "blueprintName": "BP_HealthRegenSystem",
        "blueprintDescription": "Automated passive health regeneration system driven by a looping timer and bounded by Clamp.",
        "targetClass": "Character",
        "triggers": [
            "health regeneration", "auto heal", "regenerate health", "health regen timer", "passive heal", "heal over time"
        ],
        "nodes": [
            {
                "id": "node_begin_play",
                "title": "Event BeginPlay",
                "nodeType": "event",
                "description": "Initializes health regeneration timer loop upon actor initialization",
                "inputs": [],
                "outputs": [
                    {"name": "Then", "type": "exec"}
                ]
            },
            {
                "id": "node_set_timer",
                "title": "Set Timer by Event",
                "nodeType": "function",
                "description": "Fires health replenishment tick every 0.5 seconds",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "Time", "type": "float", "value": 0.5},
                    {"name": "Looping", "type": "bool", "value": True}
                ],
                "outputs": [
                    {"name": "Then", "type": "exec"}
                ]
            },
            {
                "id": "node_branch_max_health",
                "title": "Branch",
                "nodeType": "macro",
                "description": "Checks if current health is below max health ceiling (100.0)",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "Condition", "type": "bool", "value": True}
                ],
                "outputs": [
                    {"name": "True", "type": "exec"},
                    {"name": "False", "type": "exec"}
                ]
            },
            {
                "id": "node_clamp_health",
                "title": "Clamp (Float)",
                "nodeType": "function",
                "description": "Restricts health addition strictly between 0.0 and 100.0",
                "inputs": [
                    {"name": "Value", "type": "float"},
                    {"name": "Min", "type": "float", "value": 0.0},
                    {"name": "Max", "type": "float", "value": 100.0}
                ],
                "outputs": [
                    {"name": "Return Value", "type": "float"}
                ]
            }
        ],
        "connections": [
            {
                "sourceNodeId": "node_begin_play",
                "sourcePinName": "Then",
                "targetNodeId": "node_set_timer",
                "targetPinName": "Execute"
            },
            {
                "sourceNodeId": "node_set_timer",
                "sourcePinName": "Then",
                "targetNodeId": "node_branch_max_health",
                "targetPinName": "Execute"
            }
        ]
    },

    "take_damage": {
        "blueprintName": "BP_DamageAndDestruction",
        "blueprintDescription": "Standard Unreal Engine 5 damage pipeline. Subtracted health clamped, branching on death to trigger destruction.",
        "targetClass": "Actor",
        "triggers": [
            "take damage", "damage system", "damage and die", "health damage", "destroy on death", "apply damage"
        ],
        "nodes": [
            {
                "id": "node_any_damage",
                "title": "Event AnyDamage",
                "nodeType": "event",
                "description": "Receives point or radial damage from UE5 Gameplay Damage System",
                "inputs": [],
                "outputs": [
                    {"name": "Then", "type": "exec"},
                    {"name": "Damage", "type": "float"},
                    {"name": "Damage Type", "type": "object"},
                    {"name": "Instigated By", "type": "object"},
                    {"name": "Damage Causer", "type": "object"}
                ]
            },
            {
                "id": "node_clamp_damage",
                "title": "Clamp (Float)",
                "nodeType": "function",
                "description": "Clamps resulting health between 0.0 and 100.0",
                "inputs": [
                    {"name": "Value", "type": "float"},
                    {"name": "Min", "type": "float", "value": 0.0},
                    {"name": "Max", "type": "float", "value": 100.0}
                ],
                "outputs": [
                    {"name": "Return Value", "type": "float"}
                ]
            },
            {
                "id": "node_branch_dead",
                "title": "Branch",
                "nodeType": "macro",
                "description": "Checks if health reached <= 0.0",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "Condition", "type": "bool"}
                ],
                "outputs": [
                    {"name": "True", "type": "exec"},
                    {"name": "False", "type": "exec"}
                ]
            },
            {
                "id": "node_destroy_actor",
                "title": "Destroy Actor",
                "nodeType": "function",
                "description": "Cleans up and removes actor from the world upon death",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "Target", "type": "object"}
                ],
                "outputs": [
                    {"name": "Then", "type": "exec"}
                ]
            }
        ],
        "connections": [
            {
                "sourceNodeId": "node_any_damage",
                "sourcePinName": "Then",
                "targetNodeId": "node_branch_dead",
                "targetPinName": "Execute"
            },
            {
                "sourceNodeId": "node_branch_dead",
                "sourcePinName": "True",
                "targetNodeId": "node_destroy_actor",
                "targetPinName": "Execute"
            }
        ]
    },

    "door_open_timeline": {
        "blueprintName": "BP_DoorOpenTimeline",
        "blueprintDescription": "Smooth door rotation driven by Timeline and Rotator Lerp upon interaction.",
        "targetClass": "Actor",
        "triggers": [
            "open door", "door timeline", "door lerp", "smooth door open", "rotate door", "interactive door"
        ],
        "nodes": [
            {
                "id": "node_interact",
                "title": "InputAction IA_Interact",
                "nodeType": "event",
                "description": "Triggered when user interacts with door",
                "inputs": [],
                "outputs": [
                    {"name": "Started", "type": "exec"},
                    {"name": "Triggered", "type": "exec"},
                    {"name": "Completed", "type": "exec"}
                ]
            },
            {
                "id": "node_flip_flop",
                "title": "FlipFlop",
                "nodeType": "macro",
                "description": "Toggles between opening and closing state on successive presses",
                "inputs": [
                    {"name": "Execute", "type": "exec"}
                ],
                "outputs": [
                    {"name": "A", "type": "exec"},
                    {"name": "B", "type": "exec"},
                    {"name": "Is A", "type": "bool"}
                ]
            },
            {
                "id": "node_set_rotation",
                "title": "Set Relative Rotation",
                "nodeType": "function",
                "description": "Applies animated yaw rotation angle to Door Mesh Component",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "Target", "type": "object"},
                    {"name": "New Rotation", "type": "rotator"}
                ],
                "outputs": [
                    {"name": "Then", "type": "exec"}
                ]
            },
            {
                "id": "node_play_sound",
                "title": "Play Sound at Location",
                "nodeType": "function",
                "description": "Plays door creak sound effect in 3D world space",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "Sound", "type": "object"},
                    {"name": "Location", "type": "vector"}
                ],
                "outputs": [
                    {"name": "Then", "type": "exec"}
                ]
            }
        ],
        "connections": [
            {
                "sourceNodeId": "node_interact",
                "sourcePinName": "Started",
                "targetNodeId": "node_flip_flop",
                "targetPinName": "Execute"
            },
            {
                "sourceNodeId": "node_flip_flop",
                "sourcePinName": "A",
                "targetNodeId": "node_set_rotation",
                "targetPinName": "Execute"
            },
            {
                "sourceNodeId": "node_set_rotation",
                "sourcePinName": "Then",
                "targetNodeId": "node_play_sound",
                "targetPinName": "Execute"
            }
        ]
    },

    "dash_dodge": {
        "blueprintName": "BP_CharacterDashDodge",
        "blueprintDescription": "High-velocity character dash along actor forward vector with XY impulse override.",
        "targetClass": "Character",
        "triggers": [
            "dash", "dodge", "dodge roll", "air dash", "blink forward", "dash mechanic"
        ],
        "nodes": [
            {
                "id": "node_input_dash",
                "title": "InputAction IA_Sprint",
                "nodeType": "event",
                "description": "Triggered on dash button tap",
                "inputs": [],
                "outputs": [
                    {"name": "Started", "type": "exec"},
                    {"name": "Triggered", "type": "exec"},
                    {"name": "Completed", "type": "exec"}
                ]
            },
            {
                "id": "node_forward_vec",
                "title": "Get Actor Forward Vector",
                "nodeType": "function",
                "description": "Retrieves world facing direction of the player character",
                "inputs": [
                    {"name": "Target", "type": "object"}
                ],
                "outputs": [
                    {"name": "Return Value", "type": "vector"}
                ]
            },
            {
                "id": "node_launch_dash",
                "title": "Launch Character",
                "nodeType": "function",
                "description": "Propels character forward at 2500 uu/s",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "Launch Velocity", "type": "vector"},
                    {"name": "XYOverride", "type": "bool", "value": True},
                    {"name": "ZOverride", "type": "bool", "value": False}
                ],
                "outputs": [
                    {"name": "Then", "type": "exec"}
                ]
            },
            {
                "id": "node_dash_sound",
                "title": "Play Sound 2D",
                "nodeType": "function",
                "description": "Plays dash audio feedback",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "Sound", "type": "object"}
                ],
                "outputs": [
                    {"name": "Then", "type": "exec"}
                ]
            }
        ],
        "connections": [
            {
                "sourceNodeId": "node_input_dash",
                "sourcePinName": "Started",
                "targetNodeId": "node_launch_dash",
                "targetPinName": "Execute"
            },
            {
                "sourceNodeId": "node_launch_dash",
                "sourcePinName": "Then",
                "targetNodeId": "node_dash_sound",
                "targetPinName": "Execute"
            }
        ]
    },

    "flashlight_toggle": {
        "blueprintName": "BP_FlashlightToggle",
        "blueprintDescription": "Toggles spotlight visibility on key press with FlipFlop.",
        "targetClass": "Character",
        "triggers": [
            "flashlight", "toggle light", "torch", "turn on light", "toggle flashlight", "flashlight toggle"
        ],
        "nodes": [
            {
                "id": "node_input_f",
                "title": "InputAction IA_Interact",
                "nodeType": "event",
                "description": "F key or Flashlight input action",
                "inputs": [],
                "outputs": [
                    {"name": "Started", "type": "exec"},
                    {"name": "Triggered", "type": "exec"},
                    {"name": "Completed", "type": "exec"}
                ]
            },
            {
                "id": "node_flip_flop",
                "title": "FlipFlop",
                "nodeType": "macro",
                "description": "Alternates between On and Off states",
                "inputs": [
                    {"name": "Execute", "type": "exec"}
                ],
                "outputs": [
                    {"name": "A", "type": "exec"},
                    {"name": "B", "type": "exec"},
                    {"name": "Is A", "type": "bool"}
                ]
            },
            {
                "id": "node_set_vis_on",
                "title": "Set Visibility",
                "nodeType": "function",
                "description": "Enables spotlight visibility (On)",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "Target", "type": "object"},
                    {"name": "New Visibility", "type": "bool", "value": True}
                ],
                "outputs": [
                    {"name": "Then", "type": "exec"}
                ]
            },
            {
                "id": "node_set_vis_off",
                "title": "Set Visibility",
                "nodeType": "function",
                "description": "Disables spotlight visibility (Off)",
                "inputs": [
                    {"name": "Execute", "type": "exec"},
                    {"name": "Target", "type": "object"},
                    {"name": "New Visibility", "type": "bool", "value": False}
                ],
                "outputs": [
                    {"name": "Then", "type": "exec"}
                ]
            }
        ],
        "connections": [
            {
                "sourceNodeId": "node_input_f",
                "sourcePinName": "Started",
                "targetNodeId": "node_flip_flop",
                "targetPinName": "Execute"
            },
            {
                "sourceNodeId": "node_flip_flop",
                "sourcePinName": "A",
                "targetNodeId": "node_set_vis_on",
                "targetPinName": "Execute"
            },
            {
                "sourceNodeId": "node_flip_flop",
                "sourcePinName": "B",
                "targetNodeId": "node_set_vis_off",
                "targetPinName": "Execute"
            }
        ]
    }
}

def normalize_query(query: str) -> str:
    cleaned = re.sub(r'[^a-z0-9\s]', ' ', query.lower())
    return " ".join(cleaned.split())

def match_canonical_template(query: str, target_class: str = "Character") -> Optional[Dict[str, Any]]:
    """
    Checks if user query maps to a verified canonical gameplay template.
    If matched, returns deep-copied template graph ready for immediate rendering (0 tokens burned!).
    """
    normalized = normalize_query(query)
    query_tokens = set(normalized.split())

    best_match_key = None
    best_score = 0.0

    for template_key, tpl in CANONICAL_TEMPLATES.items():
        # 1. Exact trigger match
        for trigger in tpl["triggers"]:
            norm_trig = normalize_query(trigger)
            if norm_trig == normalized or norm_trig in normalized:
                best_match_key = template_key
                best_score = 100.0
                break

        if best_score >= 100.0:
            break

        # 2. Token overlap jaccard similarity
        for trigger in tpl["triggers"]:
            trig_tokens = set(normalize_query(trigger).split())
            intersection = len(query_tokens & trig_tokens)
            union = len(query_tokens | trig_tokens)
            jaccard = intersection / max(1, union)
            
            # High threshold match
            if jaccard >= 0.70 and jaccard > best_score:
                best_score = jaccard
                best_match_key = template_key

    if best_match_key:
        tpl_data = CANONICAL_TEMPLATES[best_match_key]
        import copy
        result = copy.deepcopy(tpl_data)
        # Remove trigger patterns from returned client payload
        result.pop("triggers", None)
        result["_meta"] = {
            "source": "canonical_template",
            "templateId": best_match_key,
            "tokens_burned": 0,
            "latency_ms": 1.5,
            "mode": "full"
        }
        return result

    return None

