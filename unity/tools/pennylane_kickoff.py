"""
Boost Pitch kickoff circuit — PennyLane sidecar (architecture_only / simulation_only).

Mirrors src/game/quantumKickoff.ts:
  qml.Hadamard(wires=0)
  qml.CNOT(wires=[0, 1])
  sample computational basis → map bits to ball impulse.

Not wired to a QPU. Do not treat this as a hardware smoke.
Prints the mapping table only (anti-re-simulation).
"""

from __future__ import annotations

IMPULSE = {
    "00": (-2.4, -6.2),
    "11": (2.4, 6.2),
    "01": (-2.4, 6.2),
    "10": (2.4, -6.2),
}


def pennylane_circuit():
    """Build a 2-qubit H+CNOT sampler on default.qubit. Import is local on purpose."""
    import pennylane as qml

    dev = qml.device("default.qubit", wires=2, shots=1)

    @qml.qnode(dev)
    def kickoff():
        qml.Hadamard(wires=0)
        qml.CNOT(wires=[0, 1])
        return qml.sample(wires=[0, 1])

    return kickoff


def bits_to_impulse(bits: str) -> tuple[float, float]:
    return IMPULSE.get(bits, (0.0, -6.2))


if __name__ == "__main__":
    print("simulation_only mapping (H + CNOT → Bell-like 00/11):")
    print(IMPULSE)
    print("pennylane_circuit() available when pennylane is installed — not executed here.")
