from sqlmodel import Session, select, SQLModel
from app.database import engine
from app.models.domain import User, Collection, Arrangement

# Payload real do scoreState da Sprint 1
SAMPLE_SCORE_STATE = {
    "title": "Bossa Nova Principal",
    "bpm": 120,
    "measuresCount": 3,
    "beatsPerMeasure": 4,
    "subdivisions": 4,
    "loopState": {"active": True, "startMeasure": 0, "endMeasure": 1},
    "activeTool": {
        "instrumentId": "tamborim",
        "strokeType": "tamborim-cima"
    },
    "instruments": [
        {
            "id": "surdo1",
            "name": "Surdo 1ª",
            "iconSvg": "assets/icons/inst-surdo1.svg",
            "volume": 80,
            "availableStrokes": ["pele-aberto", "surdo-abafado"],
            "pattern": [
                [
                    "pele-aberto", None, None, None,
                    None, None, None, None,
                    "pele-aberto", None, None, None,
                    None, None, None, None
                ],
                [None] * 16,
                [None] * 16
            ]
        },
        {
            "id": "surdo2",
            "name": "Surdo 2ª",
            "iconSvg": "assets/icons/inst-surdo2.svg",
            "volume": 80,
            "availableStrokes": ["pele-aberto", "surdo-abafado"],
            "pattern": [
                [
                    None, None, None, None,
                    "pele-aberto", None, None, None,
                    None, None, None, None,
                    "pele-aberto", None, None, None
                ],
                [None] * 16,
                [None] * 16
            ]
        },
        {
            "id": "surdo3",
            "name": "Surdo 3ª",
            "iconSvg": "assets/icons/inst-surdo3.svg",
            "volume": 80,
            "availableStrokes": ["pele-aberto", "surdo-abafado"],
            "pattern": [
                [
                    "pele-aberto", None, None, None,
                    "pele-aberto", None, "pele-aberto", None,
                    "pele-aberto", None, None, None,
                    "pele-aberto", "pele-aberto", None, "pele-aberto"
                ],
                [None] * 16,
                [None] * 16
            ]
        },
        {
            "id": "caixa",
            "name": "Caixa",
            "iconSvg": "assets/icons/inst-caixa.svg",
            "volume": 83,
            "previousVolume": 83,
            "availableStrokes": ["pele-aberto", "fantasma", "aro", "rimshot", "rufo"],
            "pattern": [
                [
                    "pele-aberto", "fantasma", "fantasma", "pele-aberto",
                    "fantasma", "fantasma", "fantasma", "fantasma",
                    "pele-aberto", "fantasma", "fantasma", "fantasma",
                    "pele-aberto", "fantasma", "fantasma", "fantasma"
                ],
                [None] * 16,
                [None] * 16
            ]
        },
        {
            "id": "repique",
            "name": "Repique",
            "iconSvg": "assets/icons/inst-repique.svg",
            "volume": 80,
            "availableStrokes": ["pele-aberto", "rimshot", "aro", "slap", "rufo"],
            "pattern": [
                [
                    "pele-aberto", "pele-aberto", "rimshot", "slap",
                    "pele-aberto", "pele-aberto", "rimshot", "slap",
                    "pele-aberto", "pele-aberto", "rimshot", "slap",
                    "pele-aberto", "pele-aberto", "rimshot", "slap"
                ],
                [None] * 16,
                [None] * 16
            ]
        },
        {
            "id": "chocalho",
            "name": "Chocalho",
            "iconSvg": "assets/icons/inst-chocalho.svg",
            "volume": 100,
            "availableStrokes": ["chocalho-frente", "chocalho-tras"],
            "pattern": [
                [
                    "chocalho-frente", "chocalho-tras", "chocalho-frente", "chocalho-tras",
                    "chocalho-frente", "chocalho-tras", "chocalho-frente", "chocalho-tras",
                    "chocalho-frente", "chocalho-tras", "chocalho-frente", "chocalho-tras",
                    "chocalho-frente", "chocalho-tras", "chocalho-frente", "chocalho-tras"
                ],
                [None] * 16,
                [None] * 16
            ]
        },
        {
            "id": "tamborim",
            "name": "Tamborim",
            "iconSvg": "assets/icons/inst-tamborim.svg",
            "volume": 80,
            "availableStrokes": ["tamborim-cima", "tamborim-baixo"],
            "pattern": [
                [None] * 16,
                [None] * 16,
                [None] * 16
            ]
        }
    ]
}


def run_seed():
    # Garante que as tabelas existem antes de inserir
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        # Verifica se já existe o usuário mock
        existing_user = session.exec(select(User).where(User.username == "felipe")).first()
        if existing_user:
            print("Base já populada. Ignorando seed.")
            return

        # 1. Usuário mock
        mock_user = User(
            username="felipe",
            email="felipe@easygroove.com",
            hashed_password="mock_password_hash"
        )
        session.add(mock_user)
        session.commit()
        session.refresh(mock_user)

        # 2. Coleção de exemplo
        mock_collection = Collection(
            name="Samba Enredo 2026",
            user_id=mock_user.id
        )
        session.add(mock_collection)
        session.commit()
        session.refresh(mock_collection)

        # 3. Arranjo 1 (Associado à coleção)
        arrangement_1 = Arrangement(
            name="Bossa Nova Principal",
            score_data=SAMPLE_SCORE_STATE,
            user_id=mock_user.id,
            collection_id=mock_collection.id
        )

        # 4. Arranjo 2 (Solto na raiz da biblioteca)
        score_state_samba = dict(SAMPLE_SCORE_STATE)
        score_state_samba["title"] = "Levada de Samba Raiz"
        arrangement_2 = Arrangement(
            name="Levada de Samba Raiz",
            score_data=score_state_samba,
            user_id=mock_user.id,
            collection_id=None
        )

        session.add(arrangement_1)
        session.add(arrangement_2)
        session.commit()

        print("Seed executado com sucesso: 1 usuário, 1 coleção e 2 arranjos criados.")


if __name__ == "__main__":
    run_seed()