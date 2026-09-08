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

Endpoints esperados pela camada atual:

- `POST /auth/login`
- `GET /auth/me`
- `GET /projects`
- `POST /projects`
- `GET /projects/:id`
- `POST /evaluations`
- `GET /evaluations`
- `GET /professors`
- `POST /professors`
- `PUT /professors/:id`
- `GET /evaluators`
- `GET /ranking`

O login deve retornar um objeto com `token` e, preferencialmente, `user.role`.
Enquanto `apiBaseUrl` estiver vazio, as telas continuam usando o fluxo demonstrativo local.