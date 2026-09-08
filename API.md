# Contrato da API

Este documento descreve os endpoints esperados pelo front-end da Plataforma SIC.

## Configuração

A URL base da API é configurada em `js/config.js`:

```js
window.SIC_CONFIG = {
    apiBaseUrl: "http://localhost:3000/api"
};
```

Todas as requisições autenticadas devem usar:

```http
Authorization: Bearer TOKEN
Content-Type: application/json
Accept: application/json
```

O cliente HTTP está em `js/services/service.js`.

## Autenticação

### Login

```http
POST /auth/login
```

Requisição:

```json
{
  "email": "professor@escola.com",
  "password": "123456"
}
```

Resposta `200`:

```json
{
  "token": "jwt-ou-token-de-acesso",
  "user": {
    "id_usuario": 1,
    "nome_usuario": "Maria Silva",
    "email": "professor@escola.com",
    "tipo_usuario": "professor",
    "tipo_avaliador": "tecnico"
  }
}
```

O front-end não envia o tipo de usuário. A API deve identificar o usuário pelas credenciais e retornar `tipo_usuario` como `professor` ou `coordenador`. Para usuários do tipo `professor`, `tipo_avaliador` deve ser `tecnico` ou `artistico`.

### Usuário autenticado

```http
GET /auth/me
```

Resposta `200`:

```json
{
  "id_usuario": 1,
  "nome_usuario": "Maria Silva",
  "email": "professor@escola.com",
  "tipo_usuario": "professor",
  "tipo_avaliador": "tecnico"
}
```

## Usuários e eventos

### Listar usuários

```http
GET /users?tipo_usuario=professor&tipo_avaliador=tecnico
```

Resposta `200`:

```json
{
  "data": [
    {
      "id_usuario": 1,
      "nome_usuario": "Maria Silva",
      "email": "professor@escola.com",
      "tipo_usuario": "professor",
      "tipo_avaliador": "tecnico",
      "data_criacao": "2026-09-08T10:00:00Z"
    }
  ]
}
```

### Eventos

```http
GET /events
POST /events
GET /events/:id
PUT /events/:id
```

Requisição para criar:

```json
{
  "nome_evento": "SIC 2026",
  "data_evento": "2026-10-15",
  "status": "planejado"
}
```

`status` deve ser `planejado`, `em_andamento` ou `encerrado`.

### Participações em eventos

```http
GET /events/:id/participants
POST /events/:id/participants
DELETE /events/:id/participants/:userId
```

Requisição para vincular um usuário:

```json
{
  "id_usuario": 1
}
```

Resposta `201`:

```json
{
  "id_participacao": 20,
  "id_usuario": 1,
  "id_evento": 3,
  "data_vinculo": "2026-09-08T10:30:00Z"
}
```

O endpoint de envio de avaliação deve verificar se o avaliador possui uma participação válida no mesmo evento do projeto.

## Projetos

### Listar projetos

```http
GET /projects
```

Filtros aceitos:

```http
GET /projects?status=pendente&category=robotica&search=agua
```

Resposta `200`:

```json
{
  "data": [
    {
      "id_projeto": 42,
      "id_evento": 3,
      "nome_projeto": "Sistema de Irrigação Inteligente",
      "resumo": "Descrição do projeto",
      "estande": "A-042",
      "data_criacao": "2026-09-08T12:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 10,
    "total": 1
  }
}
```

### Detalhar projeto

```http
GET /projects/:id
```

Resposta `200`:

```json
{
  "id_projeto": 42,
  "id_evento": 3,
  "nome_projeto": "Sistema de Irrigação Inteligente",
  "resumo": "Descrição completa",
  "estande": "A-042",
  "data_criacao": "2026-09-08T12:00:00Z"
}
```

### Criar projeto

```http
POST /projects
```

Requisição:

```json
{
  "id_evento": 3,
  "nome_projeto": "Sistema de Irrigação Inteligente",
  "resumo": "Descrição do projeto",
  "estande": "A-042"
}
```

Resposta `201`:

```json
{
  "id_projeto": 42,
  "id_evento": 3,
  "nome_projeto": "Sistema de Irrigação Inteligente",
  "resumo": "Descrição do projeto",
  "estande": "A-042",
  "data_criacao": "2026-09-08T12:00:00Z"
}
```

## Avaliações

### Enviar avaliação

```http
POST /evaluations
```

Requisição:

```json
{
  "id_projeto": 42,
  "nota1": 8.5,
  "nota2": 9,
  "nota3": 7.5,
  "nota4": 10,
  "nota5": 8,
  "nota6": 9.5,
  "comentario": "Projeto bem apresentado."
}
```

Resposta `201`:

```json
{
  "id_avaliacao": 150,
  "id_avaliador": 1,
  "id_projeto": 42,
  "nota1": 8.5,
  "nota2": 9,
  "nota3": 7.5,
  "nota4": 10,
  "nota5": 8,
  "nota6": 9.5,
  "nota_media": 8.75,
  "comentario": "Projeto bem apresentado.",
  "data_criacao": "2026-09-08T12:30:00Z"
}
```

A API deve validar:

- As seis notas são obrigatórias.
- As notas ficam entre `5` e `10`.
- As notas aceitam somente intervalos de `0.5`.
- `id_avaliador` deve referenciar um usuário do tipo `professor`.
- Um avaliador não pode avaliar o mesmo projeto duas vezes, se essa for a regra do evento.
- O avaliador precisa estar vinculado ao evento em `participacao_evento`.

### Listar avaliações

```http
GET /evaluations
```

Filtros recomendados:

```http
GET /evaluations?projectId=42&evaluatorId=1
```

Resposta `200`:

```json
{
  "data": [
    {
      "id_avaliacao": 150,
      "id_avaliador": 1,
      "id_projeto": 42,
      "nota_media": 8.75,
      "comentario": "Projeto bem apresentado.",
      "data_criacao": "2026-09-08T12:30:00Z"
    }
  ],
  "meta": {
    "total": 1
  }
}
```

## Professores

```http
GET /professors
POST /professors
PUT /professors/:id
```

Exemplo de criação:

```json
{
  "nome_usuario": "Ana Silva",
  "email": "ana.silva@escola.com",
  "senha": "senha-temporaria",
  "tipo_usuario": "professor",
  "tipo_avaliador": "tecnico"
}
```

Resposta:

```json
{
  "id_usuario": 7,
  "nome_usuario": "Ana Silva",
  "email": "ana.silva@escola.com",
  "tipo_usuario": "professor",
  "tipo_avaliador": "tecnico",
  "data_criacao": "2026-09-08T10:00:00Z"
}
```

## Avaliadores

```http
GET /evaluators
```

Resposta `200`:

```json
{
  "data": [
    {
      "id_usuario": 1,
      "nome_usuario": "Maria Silva",
      "email": "maria@escola.com",
      "tipo_usuario": "professor",
      "tipo_avaliador": "tecnico",
      "avaliacoes_count": 7
    }
  ]
}
```

## Ranking

```http
GET /ranking
```

Filtro opcional:

```http
GET /ranking?category=robotica
```

Resposta `200`:

```json
{
  "data": [
    {
      "posicao": 1,
      "id_projeto": 42,
      "nome_projeto": "Sistema de Irrigação Inteligente",
      "nota_media": 9.25,
      "avaliacoes_count": 5
    }
  ],
  "meta": {
    "updatedAt": "2026-09-08T12:40:00Z"
  }
}
```

## Padrão de erros

Todos os endpoints devem responder erros neste formato:

```json
{
  "message": "Descrição do erro",
  "code": "VALIDATION_ERROR",
  "errors": {
    "email": "E-mail inválido"
  }
}
```

Status HTTP recomendados:

| Status | Uso |
| --- | --- |
| `400` | Requisição inválida |
| `401` | Usuário não autenticado ou token inválido |
| `403` | Usuário sem permissão |
| `404` | Registro não encontrado |
| `409` | Conflito, como avaliação duplicada |
| `422` | Erro de validação |
| `500` | Erro interno do servidor |

## Requisitos do servidor

- Habilitar CORS para a origem do front-end.
- Retornar JSON em todos os endpoints.
- Usar HTTPS em produção.
- Validar o token em todas as rotas protegidas.
- Controlar permissões por perfil.
- Armazenar senha com hash seguro, nunca em texto puro.
- Registrar data, usuário e projeto em cada avaliação.

Enquanto `apiBaseUrl` estiver vazio, o front-end continua usando o fluxo demonstrativo local.

## Recomendações para o banco

O schema fornecido funciona como base, mas a API deve acrescentar as seguintes regras:

- `usuario.email` deve ser `UNIQUE` e `NOT NULL`.
- `usuario.senha_hash` deve ser obrigatória e nunca retornar nas respostas.
- `tipo_avaliador` deve ser obrigatório somente quando `tipo_usuario = 'professor'`.
- `participacao_evento` deve ter `UNIQUE (id_usuario, id_evento)`.
- `avaliacao` deve ter `UNIQUE (id_avaliador, id_projeto)` se cada avaliador puder avaliar um projeto apenas uma vez.
- As seis notas devem ter `CHECK` entre `5` e `10` e aceitar somente incrementos de `0.5`.
- `nota_media` deve ser calculada pelo servidor, nunca confiada ao cliente.
- Todas as chaves estrangeiras devem definir a política de exclusão desejada.
