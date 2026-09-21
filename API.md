# Relatorio da API

Documentacao para consumo pelo frontend da API de avaliacao da Feira de Ciencias.

## 1. Configuracao

Servidor local:

```text
https://avaliacao-feira-de-ciencias-api.onrender.com
```

Rotas base:

| Recurso | Prefixo |
|---|---|
| Autenticacao | `/auth` |
| Eventos | `/event` |
| Projetos | `/project` |
| Categorias | `/categoria` |
| Avaliacoes | `/review` |
| Professores | `/teacher` |
| Criterios | `/criterios` |
| Ranking | `/ranking` |
| Atribuicoes | `/assignment` |

Todas as requisicoes com JSON devem usar:

```http
Content-Type: application/json
```

Os IDs retornados pelo PostgreSQL podem chegar como `string`, mesmo sendo numericos no banco. O frontend deve comparar IDs convertendo para string ou normalizar a resposta.

## 2. Atribuicoes de projetos

As rotas desta seção exigem token de coordenador. O mesmo projeto pode ser atribuido a varios avaliadores, mas a mesma combinacao projeto/avaliador nao pode ser cadastrada duas vezes.

### POST `/assignment`

Cria uma atribuicao de projeto para um professor avaliador.

#### Body

```json
{
  "id_projeto": 1,
  "id_avaliador": 10
}
```

O avaliador precisa ser professor e estar vinculado ao mesmo evento do projeto.

#### Resposta `201`

Retorna a atribuicao criada com `id_atribuicao`, `id_projeto`, `id_avaliador`, `id_atribuido_por` e `data_criacao`.

Retorna `409` quando o avaliador ja estiver atribuido ao projeto.

### DELETE `/assignment/:id_projeto/:id_avaliador`

Remove a atribuicao individual. Retorna `404` se ela nao existir.

### GET `/assignment/evento/:id_evento`

Lista todas as atribuicoes dos projetos de um evento, incluindo os dados basicos do projeto e do avaliador.

Professores podem consultar somente os projetos destinados a eles nas rotas de projetos, no painel, no ranking e na avaliacao. O formato das respostas existentes permanece igual; apenas os projetos nao atribuidos deixam de ser retornados.

## 3. Autenticacao

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
- `convidado`

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

Exclui um professor. Requer token de coordenador. Professores que ja possuem avaliacoes nao podem ser excluidos.

#### Resposta `200`

```json
{
  "mensagem": "Usuário deletado com sucesso!"
}
```

### PUT `/auth/usuario/:id`

Edita os dados de um professor e substitui seus eventos vinculados. Requer token de coordenador.

#### Body

```json
{
  "nome": "Maria Silva Atualizada",
  "email": "maria@exemplo.com",
  "senha": "nova-senha",
  "tipo_avaliador": "tecnico",
  "eventos": [1, 2]
}
```

`senha` e opcional. O professor nao pode ser desvinculado de um evento enquanto possuir atribuicoes de projetos desse evento.

## 4. Eventos

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
  ]
}
```

Os projetos do dashboard sao ordenados pela maior `pontuacao_total`.

  ### GET `/ranking/:id_evento`

  Retorna o ranking dos projetos de um evento, **agrupado por categoria/area** (ex: Fund1, Ensino Medio, Tecnico em Quimica). Dentro de cada categoria, os projetos sao ordenados pela maior pontuacao total. Requer token JWT, mas pode ser consultado por qualquer usuario autenticado.

  #### Parametros

  | Parametro | Tipo | Descricao |
  |---|---|---|
  | `id_evento` | inteiro | ID do evento |

  #### Exemplo de requisicao

  ```http
  GET https://avaliacao-feira-de-ciencias-api.onrender.com/ranking/1
  Authorization: Bearer SEU_TOKEN
  ```

  #### Resposta `200`

  ```json
  {
    "evento": {
      "id_evento": "1",
      "nome_evento": "Feira de Ciencias 2026"
    },
    "categorias": [
      {
        "id_categoria": "6",
        "nome_categoria": "Tecnico em Quimica",
        "ranking": [
          {
            "colocacao": 1,
            "id_projeto": "3",
            "nome_projeto": "Energia Sustentavel",
            "resumo": "Estudo sobre energia solar",
            "estande": "12",
            "nota_media": "342.0",
            "total_avaliacoes": 4
          }
        ]
      },
      {
        "id_categoria": "1",
        "nome_categoria": "Fund1",
        "ranking": [
          {
            "colocacao": 1,
            "id_projeto": "1",
            "nome_projeto": "Agua Limpa",
            "resumo": "Sistema de filtragem de agua",
            "estande": "8",
            "nota_media": "237.0",
            "total_avaliacoes": 3
          }
        ]
      }
    ]
  }
  ```

  Todos os projetos do evento sao listados, inclusive os que ainda nao receberam avaliacao. Projetos sem avaliacao possuem `nota_media` igual a `0`. O valor de `nota_media` representa a soma das pontuacoes das avaliacoes. A `colocacao` e calculada separadamente dentro de cada categoria.

  #### Resposta `404`

  ```json
  {
    "error": "Evento não encontrado"
  }
  ```

  ### GET `/ranking/:id_evento/:id_categoria`

  Retorna o ranking apenas dos projetos de uma categoria/area especifica dentro do evento. Requer token JWT.

  #### Parametros

  | Parametro | Tipo | Descricao |
  |---|---|---|
  | `id_evento` | inteiro | ID do evento |
  | `id_categoria` | inteiro | ID da categoria |

  #### Exemplo de requisicao

  ```http
  GET https://avaliacao-feira-de-ciencias-api.onrender.com/ranking/1/6
  Authorization: Bearer SEU_TOKEN
  ```

  #### Resposta `200`

  ```json
  {
    "evento": {
      "id_evento": "1",
      "nome_evento": "Feira de Ciencias 2026"
    },
    "categoria": {
      "id_categoria": "6",
      "nome_categoria": "Tecnico em Quimica"
    },
    "ranking": [
      {
        "colocacao": 1,
        "id_projeto": "3",
        "nome_projeto": "Energia Sustentavel",
        "resumo": "Estudo sobre energia solar",
        "estande": "12",
        "nota_media": "342.0",
        "total_avaliacoes": 4
      }
    ]
  }
  ```

  #### Resposta `404`

  ```json
  {
    "error": "Categoria não encontrada"
  }
  ```

## 5. Projetos

As operações de criacao, edicao e exclusao de projetos exigem token de coordenador. A exclusao nao remove projetos que ja possuem avaliacoes.

### POST `/project`

Cria um projeto. Requer token de coordenador.

#### Body

```json
{
  "id_evento": 1,
  "id_categoria": 6,
  "nome_projeto": "Energia Sustentavel",
  "resumo": "Estudo sobre energia solar",
  "estande": "12"
}
```

`id_categoria` e obrigatorio e precisa ser o ID de uma categoria existente (ver secao [Categorias](#5-categorias)).

#### Resposta `200`

```json
{
    "message": "Projeto criado com sucesso!!"
    }
```

#### Resposta `404`

```json
{
  "error": "Categoria não encontrada"
}
```

### GET `/project/:id_evento`

Lista todos os projetos de um evento. A resposta inclui as informacoes do projeto, a categoria, totais e avaliacoes.

#### Query params (opcional)

| Parametro | Tipo | Descricao |
|---|---|---|
| `id_categoria` | inteiro | Filtra os projetos retornados por uma categoria especifica |

```http
GET https://avaliacao-feira-de-ciencias-api.onrender.com/project/1?id_categoria=6
```

#### Resposta `200`

```json
[
  {
    "id_projeto": "1",
    "id_evento": "1",
    "id_categoria": "6",
    "nome_categoria": "Tecnico em Quimica",
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

Busca um projeto especifico pelo ID. A resposta tem o mesmo formato de um item da listagem anterior, incluindo `id_categoria` e `nome_categoria`.

### PUT `/project/:id_projeto`

Edita um projeto. Requer token de coordenador.

#### Body

```json
{
  "id_evento": 1,
  "id_categoria": 6,
  "nome_projeto": "Energia Sustentavel Atualizado",
  "resumo": "Novo resumo do projeto",
  "estande": "12"
}
```

Todos os campos sao obrigatorios. O evento e a categoria precisam existir. Se o projeto possuir atribuicoes, os avaliadores precisam participar do novo evento.

### DELETE `/project/:id_projeto`

Exclui um projeto. Requer token de coordenador. Projetos que ja possuem avaliacoes nao podem ser excluidos.

### GET `/project/:id_evento/:id_usuario/evaluated`

Lista os projetos do evento que ja foram avaliados pelo usuario autenticado.

### GET `/project/:id_evento/:id_usuario/not_evaluated`

Lista os projetos do evento que ainda nao foram avaliados pelo usuario autenticado.

Nas duas rotas, `:id_usuario` deve ser o mesmo ID do token.

## 6. Categorias

Categorias representam a area/nivel estudantil do projeto (ex: `Fund1`, `Fund2`, `Ensino Médio`, `Técnico em Informática`, `Técnico em Administração`, `Técnico em Química`, `Técnico em Radiologia`, `Técnico em Enfermagem`). Essas oito categorias ja vem cadastradas por padrao no banco.

### POST `/categoria`

Cria uma nova categoria. Requer token de coordenador.

#### Body

```json
{
  "nome_categoria": "Tecnico em Quimica",
  "descricao": "Projetos do curso tecnico em Quimica"
}
```

`descricao` e opcional.

#### Resposta `200`

```json
{
  "message": "Categoria criada com sucesso!!"
}
```

### GET `/categoria`

Lista todas as categorias cadastradas, ordenadas por nome.

#### Resposta `200`

```json
[
  {
    "id_categoria": "1",
    "nome_categoria": "Fund1",
    "descricao": null,
    "data_criacao": "2026-09-10T12:00:00.000Z"
  }
]
```

### GET `/categoria/:id_categoria`

Busca uma categoria especifica pelo ID.

#### Resposta `200`

```json
{
  "id_categoria": "6",
  "nome_categoria": "Tecnico em Quimica",
  "descricao": null,
  "data_criacao": "2026-09-10T12:00:00.000Z"
}
```

#### Resposta `404`

```json
{
  "error": "Categoria não encontrada"
}
```

## 7. Avaliacoes

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
| `convidado` | `1` |

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

## 8. Professores

O coordenador pode editar professores por `PUT /auth/usuario/:id` e exclui-los por `DELETE /auth/usuario/:id`. A edicao atualiza os dados cadastrais e substitui os eventos vinculados. Professores com avaliacoes nao podem ser excluidos.

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

## 9. Criterios

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

## 10. Codigos de resposta

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

## 11. Exemplo de cliente JavaScript

```js
const API_URL = "https://avaliacao-feira-de-ciencias-api.onrender.com";

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

## 12. Pontos de atencao para o frontend

- Salve o `token` recebido no login e envie-o como `Bearer`.
- Nao envie `id_avaliador` ao registrar avaliacao.
- Ao criar um projeto, envie `id_categoria` junto com `id_evento`.
- Para montar formularios de cadastro de projeto, use `GET /categoria` para listar as opcoes de categoria.
- O ranking (`GET /ranking/:id_evento`) agora retorna um array `categorias`, cada uma com seu proprio `ranking` interno — nao existe mais um unico array `ranking` plano para o evento inteiro.
- Para professor, use `GET /project/:id_evento/:id_usuario/not_evaluated` para montar a fila de avaliacao.
- Depois de enviar uma avaliacao, atualize a fila ou recarregue o projeto.
- Use o dashboard para a tela do coordenador.
- Converta campos numericos vindos como string antes de fazer calculos no frontend.
- Nao exiba o token em logs ou na interface.
- O frontend deve tratar `401` limpando a sessao e redirecionando para login.
- O frontend deve tratar `403` como falta de permissao, sem repetir automaticamente a requisicao.