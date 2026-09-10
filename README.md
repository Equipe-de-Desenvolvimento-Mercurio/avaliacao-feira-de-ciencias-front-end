Estrutura de Pastas
projeto/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js
│   ├── services/
│   ├── components/
│   └── utils/
└── assets/
    ├── images/
    └── icons/

Descrição
index.html — página principal do projeto.
css/ — arquivos de estilos.
js/ — arquivos JavaScript.
services/ — comunicação com APIs.
components/ — componentes da interface.
utils/ — funções auxiliares.
assets/ — imagens, ícones e outros arquivos estáticos.

Integração com API
-------------------
O front-end possui uma camada de serviços em `js/services/service.js`.
Para conectar uma API, informe a URL base em `js/config.js`:

```js
window.SIC_CONFIG = {
    apiBaseUrl: "https://sua-api.exemplo.com"
};
```

Endpoints consumidos pela camada atual:

- `POST /auth/login`
- `POST /auth/cadastrar`
- `DELETE /auth/usuario/:id`
- `GET /event/:id_usuario`
- `GET /event/:id_evento/dashboard`
- `GET /project/:id_evento`
- `GET /project/id/:id_projeto`
- `GET /project/:id_evento/:id_usuario/not_evaluated`
- `GET /project/:id_evento/:id_usuario/evaluated`
- `POST /project`
- `POST /review`
- `GET /teacher/evento/:id_evento`
- `GET /teacher/:id_evento/:id_usuario`
- `GET /criterios/:id_usuario`

O login deve retornar `token` e os dados do usuário em `data`, conforme o contrato da API.
Enquanto `apiBaseUrl` estiver vazio, as telas continuam usando o fluxo demonstrativo local.