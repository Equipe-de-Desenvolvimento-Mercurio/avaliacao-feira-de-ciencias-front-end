# Relatorio da API

Documentacao para consumo pelo frontend da API de avaliacao da Feira de Ciencias.

## 1. Configuracao

Servidor local:

```text
http://localhost:3000
```

Rotas base:

| Recurso | Prefixo |
|---|---|
| Autenticacao | `/auth` |
| Eventos | `/event` |
| Projetos | `/project` |
| Avaliacoes | `/review` |
| Professores | `/teacher` |
| Criterios | `/criterios` |
| Ranking | `/ranking` |

Todas as requisicoes com JSON devem usar:

```http
Content-Type: application/json
```

Os IDs retornados pelo PostgreSQL podem chegar como `string`, mesmo sendo numericos no banco. O frontend deve comparar IDs convertendo para string ou normalizar a resposta.

## 2. Autenticacao

As rotas protegidas usam JWT. Depois do login, envie o token em todas as requisicoes protegidas:

```http
Authorization: Bearer SEU_TOKEN
```

### POST `/auth/login`

Autenticacao de usuario.

#### Body

```json
{
  "email": "professor@exemplo.com",
  "senha": "senha-do-usuario"
}
```

#### Resposta `200`

```json
{
  "mensagem": "Login feito com Sucesso",
  "data": {
    "id": "1",
    "nome": "Maria Silva",
    "email": "professor@exemplo.com",
    "tipo_usuario": "professor"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

Valores de `tipo_usuario`:

- `professor`
- `coordenador`

Valores de `tipo_avaliador` para professores:

- `tecnico`
- `artistico`

### POST `/auth/cadastrar`

Cria um usuario. Atualmente esta rota nao exige token.

#### Body de professor

```json
{
  "nome": "Maria Silva",
  "email": "professor@exemplo.com",
  "senha": "senha-segura",
  "tipo_usuario": "professor",
  "tipo_avaliador": "tecnico",
  "eventos": [1, 2]
}
```

#### Body de coordenador

```json
{
  "nome": "Coordenador da Feira",
  "email": "coordenador@exemplo.com",
  "senha": "senha-segura",
  "tipo_usuario": "coordenador",
  "eventos": []
}
```

`eventos` deve ser um array de IDs existentes. Para professor, o tipo de avaliador e obrigatorio. Para coordenador, `tipo_avaliador` nao deve ser informado.

#### Resposta `200`

```json
{
  "message": "Usuario Registrado com sucesso"
}
```

### DELETE `/auth/usuario/:id`

Exclui um usuario. Requer token de coordenador.

#### Resposta `200`

```json
{
  "mensagem": "Usuário deletado com sucesso!"
}
```

## 3. Eventos

### POST `/event`

Cria um evento. Requer token de coordenador.

#### Body

```json
{
  "nome_evento": "Feira de Ciencias 2026",
  "data_evento": "2026-09-29",
  "status": "planejado"
}
```

`status` pode ser:

- `planejado`
- `em_andamento`
- `encerrado`

A data deve estar no formato `YYYY-MM-DD`.

#### Resposta `201`

Retorna o evento criado:

```json
{
  "id_evento": "1",
  "nome_evento": "Feira de Ciencias 2026",
  "data_evento": "2026-09-29",
  "status": "planejado",
  "data_criacao": "2026-09-10T12:00:00.000Z"
}
```

### GET `/event/:id_usuario`

Lista os eventos vinculados ao usuario autenticado.

O ID da URL deve ser o mesmo ID presente no token.

#### Resposta `200`

```json
[
  {
    "id_evento": "1",
    "nome_evento": "Feira de Ciencias 2026",
    "data_evento": "2026-09-29",
    "status": "em_andamento"
  }
]
```

### GET `/event/:id_evento/dashboard`

Retorna o painel consolidado do evento. Requer token de coordenador.

#### Resposta `200`

```json
{
  "evento": {
    "id_evento": "1",
    "nome_evento": "Feira de Ciencias 2026",
    "data_evento": "2026-09-29",
    "status": "em_andamento"
  },
  "resumo": {
    "total_avaliadores": 4,
    "total_projetos": 10,
    "projetos_avaliados": 7,
    "projetos_pendentes": 3,
    "total_avaliacoes": 28,
    "avaliacoes_esperadas": 40,
    "percentual_conclusao": "70.0"
  },
  "projetos": [
    {
      "id_projeto": "1",
      "nome_projeto": "Energia Sustentavel",
      "resumo": "Estudo sobre energia solar",
      "estande": "12",
      "pontuacao_total": "138.0",
      "total_avaliaram": 4,
      "total_avaliadores": 4,
      "percentual_conclusao": "100.0",
      "concluido": true
    }
  ],
  "grafico": [
    {
      "data": "2026-09-15",
      "avaliacoes": 8
    }
  ],
  "atividades_recentes": [
    {
      "tipo": "avaliacao",
      "mensagem": "Maria Silva avaliou Energia Sustentavel",
      "data": "2026-09-15T13:00:00.000Z"
    }
  ],
  "notificacoes": []
}
```

Os projetos do dashboard sao ordenados pela maior `pontuacao_total`.

O campo `grafico` agrupa a quantidade de avaliacoes por dia. A data usa o formato `YYYY-MM-DD`.

O campo `atividades_recentes` lista as ultimas atividades do evento. Atualmente, cada item de avaliacao possui `tipo`, `mensagem` e `data`.

O campo `notificacoes` lista as notificacoes do evento. Quando nao houver notificacoes, a API deve retornar um array vazio (`[]`).

  ### GET `/ranking/:id_evento`

  Retorna o ranking de todos os projetos de um evento, ordenado pela maior media das notas. Requer token JWT, mas pode ser consultado por qualquer usuario autenticado.

  #### Parametros

  | Parametro | Tipo | Descricao |
  |---|---|---|
  | `id_evento` | inteiro | ID do evento |

  #### Exemplo de requisicao

  ```http
  GET http://localhost:3000/ranking/1
  Authorization: Bearer SEU_TOKEN
  ```

  #### Resposta `200`

  ```json
  {
    "evento": {
      "id_evento": "1",
      "nome_evento": "Feira de Ciencias 2026"
    },
    "ranking": [
      {
        "colocacao": 1,
        "id_projeto": "3",
        "nome_projeto": "Energia Sustentavel",
        "resumo": "Estudo sobre energia solar",
        "estande": "12",
        "nota_media": "85.5",
        "total_avaliacoes": 4
      },
      {
        "colocacao": 2,
        "id_projeto": "1",
        "nome_projeto": "Agua Limpa",
        "resumo": "Sistema de filtragem de agua",
        "estande": "8",
        "nota_media": "79.0",
        "total_avaliacoes": 3
      }
    ]
  }
  ```

  Todos os projetos do evento sao listados, inclusive os que ainda nao receberam avaliacao. Projetos sem avaliacao possuem `nota_media` igual a `0`. Em caso de empate, os projetos recebem a mesma `colocacao`.

  #### Resposta `404`

  ```json
  {
    "error": "Evento não encontrado"
  }
  ```

## 4. Projetos

### POST `/project`

Cria um projeto. Requer token de coordenador.

#### Body

```json
{
  "id_evento": 1,
  "nome_projeto": "Energia Sustentavel",
  "resumo": "Estudo sobre energia solar",
  "estande": "12"
}
```

#### Resposta `200`

```json
{
  "message": "Projeto criado com sucesso!!"
}
```

### GET `/project/:id_evento`

Lista todos os projetos de um evento. A resposta inclui as informacoes do projeto, totais e avaliacoes.

#### Resposta `200`

```json
[
  {
    "id_projeto": "1",
    "id_evento": "1",
    "nome_projeto": "Energia Sustentavel",
    "resumo": "Estudo sobre energia solar",
    "estande": "12",
    "data_criacao": "2026-09-10T12:00:00.000Z",
    "pontuacao_total": "138.0",
    "total_avaliadores": "4",
    "total_avaliaram": "4",
    "avaliacoes": [
      {
        "id_avaliacao": "1",
        "id_avaliador": "10",
        "nota1": "8.0",
        "nota2": "9.0",
        "nota3": "8.5",
        "nota4": "9.0",
        "nota5": "8.0",
        "nota6": "9.0",
        "pontuacao_total": "27.0",
        "comentario": "Boa apresentacao",
        "data_criacao": "2026-09-10T13:00:00.000Z"
      }
    ]
  }
]
```

### GET `/project/id/:id_projeto`

Busca um projeto especifico pelo ID. A resposta tem o mesmo formato de um item da listagem anterior.

### GET `/project/:id_evento/:id_usuario/evaluated`

Lista os projetos do evento que ja foram avaliados pelo usuario autenticado.

### GET `/project/:id_evento/:id_usuario/not_evaluated`

Lista os projetos do evento que ainda nao foram avaliados pelo usuario autenticado.

Nas duas rotas, `:id_usuario` deve ser o mesmo ID do token.

## 5. Avaliacoes

### POST `/review`

Registra uma avaliacao. Requer token de um professor vinculado ao evento do projeto.

O backend identifica o avaliador pelo token. Nao envie `id_avaliador` no body.

O evento precisa estar com status `em_andamento`.

#### Body

```json
{
  "id_projeto": 1,
  "notas": [
    8.0,
    9.0,
    8.5,
    9.0,
    8.0,
    9.0
  ],
  "comentario": "Boa apresentacao e dominio do assunto."
}
```

Cada nota deve ser numerica e estar entre `0` e `10`. Atualmente sao exigidas exatamente seis notas.

O backend calcula a pontuacao sem receber o peso do frontend:

```text
pontuacao_total = (nota1 + nota2 + nota3 + nota4 + nota5 + nota6) * peso
```

Pesos atuais:

| Tipo de avaliador | Peso |
|---|---:|
| `artistico` | `1` |
| `tecnico` | `3` |

Exemplo para um avaliador tecnico:

```text
(8 + 9 + 8.5 + 9 + 8 + 9) * 3 = 154.5
```

#### Resposta `201`

```json
{
  "message": "Projeto avaliado com sucesso!!",
  "soma_notas": 51.5,
  "peso": 3,
  "pontuacao_total": 154.5
}
```

Uma avaliacao por professor e permitida para cada projeto.

## 6. Professores

### GET `/teacher/evento/:id_evento`

Lista os professores vinculados ao evento. Requer token.

#### Resposta `200`

```json
[
  {
    "id_usuario": "10",
    "nome_usuario": "Maria Silva",
    "email": "professor@exemplo.com",
    "tipo_usuario": "professor",
    "tipo_avaliador": "tecnico"
  }
]
```

A resposta nao inclui `senha_hash`.

### GET `/teacher/:id_evento/:id_usuario`

Retorna o painel de avaliacao de um professor no evento. Requer que o professor autenticado seja o mesmo informado na URL.

#### Resposta `200`

```json
{
  "evento": {
    "id_evento": "1",
    "nome_evento": "Feira de Ciencias 2026"
  },
  "usuario": {
    "id_usuario": "10",
    "nome_usuario": "Maria Silva",
    "email": "professor@exemplo.com",
    "tipo_usuario": "professor",
    "tipo_avaliador": "tecnico"
  },
  "resumo": {
    "total_projetos": 10,
    "total_avaliados": 7,
    "total_nao_avaliados": 3,
    "pontuacao_total": 138
  },
  "projetos": [
    {
      "id_projeto": "1",
      "nome_projeto": "Energia Sustentavel",
      "resumo": "Estudo sobre energia solar",
      "estande": "12",
      "avaliado": true,
      "avaliacao": {
        "id_avaliacao": "1",
        "nota1": "8.0",
        "nota2": "9.0",
        "nota3": "8.5",
        "nota4": "9.0",
        "nota5": "8.0",
        "nota6": "9.0",
        "pontuacao_total": "27.0",
        "comentario": "Boa apresentacao",
        "data_criacao": "2026-09-10T13:00:00.000Z"
      }
    }
  ]
}
```

## 7. Criterios

### GET `/criterios/:id_usuario`

Lista os criterios de acordo com o tipo de avaliador do usuario autenticado.

O ID da URL deve ser o mesmo ID do token.

#### Resposta `200`

```json
[
  {
    "id_criterio": "1",
    "tipo_avaliador": "tecnico",
    "numero_criterio": 1,
    "nome_criterio": "Criatividade",
    "descricao": "Descricao do criterio",
    "data_criacao": "2026-09-10T12:00:00.000Z"
  }
]
```

## 8. Codigos de resposta

| Codigo | Uso |
|---:|---|
| `200` | Consulta ou operacao concluida |
| `201` | Recurso criado |
| `400` | Dados enviados invalidos |
| `401` | Token ausente ou invalido |
| `403` | Usuario sem permissao |
| `404` | Recurso nao encontrado |
| `409` | Conflito, como avaliacao duplicada |
| `500` | Erro interno do servidor |

Formato geral de erro:

```json
{
  "error": "Mensagem do erro"
}
```

A rota de exclusao de usuario usa a chave `erro` em alguns retornos:

```json
{
  "erro": "Usuário não encontrado."
}
```

## 9. Exemplo de cliente JavaScript

```js
const API_URL = "http://localhost:3000";

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error || body?.erro || "Erro na requisicao");
  }

  return body;
}

async function fazerLogin(email, senha) {
  const resultado = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, senha })
  });

  localStorage.setItem("token", resultado.token);
  localStorage.setItem("usuario", JSON.stringify(resultado.data));
  return resultado;
}
```

## 10. Pontos de atencao para o frontend

- Salve o `token` recebido no login e envie-o como `Bearer`.
- Nao envie `id_avaliador` ao registrar avaliacao.
- Para professor, use `GET /project/:id_evento/:id_usuario/not_evaluated` para montar a fila de avaliacao.
- Depois de enviar uma avaliacao, atualize a fila ou recarregue o projeto.
- Use o dashboard para a tela do coordenador.
- Converta campos numericos vindos como string antes de fazer calculos no frontend.
- Nao exiba o token em logs ou na interface.
- O frontend deve tratar `401` limpando a sessao e redirecionando para login.
- O frontend deve tratar `403` como falta de permissao, sem repetir automaticamente a requisicao.
