(function () {
    "use strict";

    var api = window.SICApi;

    function currentUser() {
        return api && api.auth.getUser();
    }

    function userId(user) {
        return user && (user.id || user.id_usuario);
    }

    function userRole(user) {
        return user && String(user.tipo_usuario || user.role || "").toLowerCase();
    }

    function firstEvent(events) {
        return Array.isArray(events) ? events[0] : events;
    }

    function getEventId() {
        return window.localStorage.getItem("sic_current_event") || (currentUser() && (currentUser().id_evento || currentUser().id_event));
    }

    function normalizeStatus(status) {
        return String(status || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[\s-]+/g, "_");
    }

    function normalizeEvents(response) {
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.data)) return response.data;
        if (response && Array.isArray(response.eventos)) return response.eventos;
        return [];
    }

    function loadEventSelection() {
        var container = document.querySelector("#eventos-disponiveis");
        var user = currentUser();
        if (!container || !user || !api || !api.isConfigured()) return;

        api.events.listByUser(userId(user)).then(function (response) {
            var events = normalizeEvents(response);
            container.innerHTML = "";
            if (!events || !events.length) {
                container.innerHTML = "<p class=\"api-empty\">Nenhum evento foi vinculado ao seu usuário.</p>";
                return;
            }
            events.forEach(function (event) {
                var button = document.createElement("button");
                button.type = "button";
                button.className = "evento-card";
                button.innerHTML = "<strong></strong><span></span><small></small>";
                var available = normalizeStatus(event.status) === "em_andamento";
                button.disabled = !available;
                button.querySelector("strong").textContent = event.nome_evento;
                button.querySelector("span").textContent = "Data: " + event.data_evento;
                button.querySelector("small").textContent = available ? "Disponível para avaliação" : "Indisponível: " + event.status;
                button.addEventListener("click", function () {
                    if (!available) return;
                    window.localStorage.setItem("sic_current_event", event.id_evento);
                    window.location.href = "home.html";
                });
                container.appendChild(button);
            });
        }).catch(showError);
    }

    function loadProjectEventOptions() {
        var select = document.querySelector("#evento-projeto");
        var user = currentUser();
        if (!select || !user || !api || !api.isConfigured()) return;

        api.events.listByUser(userId(user)).then(function (response) {
            var events = normalizeEvents(response);
            select.innerHTML = "<option value=\"\">Selecione o evento</option>";
            events.forEach(function (event) {
                var option = document.createElement("option");
                option.value = event.id_evento;
                option.textContent = event.nome_evento + " - " + event.status;
                select.appendChild(option);
            });
            var currentEvent = window.localStorage.getItem("sic_current_event");
            if (currentEvent) select.value = currentEvent;
        }).catch(showError);
    }

    function loadCoordinatorProfessors() {
        var list = document.querySelector("#lista-professores-api");
        var user = currentUser();
        if (!list || !user || userRole(user) !== "coordenador" || !api || !api.isConfigured()) return;

        var eventId = getEventId();
        var eventRequest = eventId ? Promise.resolve(eventId) : api.events.listByUser(userId(user)).then(function (response) {
            var events = normalizeEvents(response);
            return events[0] && events[0].id_evento;
        });

        eventRequest.then(function (selectedEventId) {
            if (!selectedEventId) throw new Error("Nenhum evento selecionado para listar os professores.");
            window.localStorage.setItem("sic_current_event", selectedEventId);
            return api.professors.list(selectedEventId);
        }).then(function (response) {
            var professors = normalizeEvents(response);
            list.innerHTML = "";
            setupProfessorFilters(professors, list);
        }).catch(showError);
    }

    function setupProfessorFilters(professors, list) {
        var search = document.querySelector("#busca-professor");
        var type = document.querySelector("#filtro-tipo-professor");
        var counter = document.querySelector("#professores-contador");
        var normalized = function (value) {
            return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        };
        var typeOf = function (professor) { return professor.tipo_avaliador || "Não informado"; };
        var nameOf = function (professor) { return professor.nome_usuario || professor.nome || "Sem nome"; };
        var emailOf = function (professor) { return professor.email || "Sem e-mail"; };
        var types = Array.from(new Set(professors.map(typeOf))).sort();

        type.innerHTML = "<option value=\"\">Todos os tipos</option>";
        types.forEach(function (value) {
            var option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            type.appendChild(option);
        });

        function render() {
            var term = normalized(search.value);
            var selectedType = normalized(type.value);
            var filtered = professors.filter(function (professor) {
                return (!term || normalized(nameOf(professor) + " " + emailOf(professor)).indexOf(term) !== -1) &&
                    (!selectedType || normalized(typeOf(professor)) === selectedType);
            });
            list.innerHTML = "";
            if (!filtered.length) list.innerHTML = "<p class=\"api-empty\">Nenhum professor corresponde aos filtros.</p>";
            filtered.forEach(function (professor) {
                var row = document.createElement("div");
                row.className = "registro";
                row.innerHTML = "<div class=\"info\" id=\"info-nome\"><div class=\"perfil\"></div><div class=\"nome\"><h4></h4><p></p></div></div>" +
                    "<div class=\"info\" id=\"info-email\"><p></p></div>" +
                    "<div class=\"info\" id=\"info-projetos\"><div class=\"contagem\"><p>-</p></div></div>" +
                    "<div class=\"info\" id=\"info-acoes\"><button type=\"button\" title=\"Monitorar professor\"><i class=\"fi fi-rr-eye\"></i></button></div>";
                row.querySelector("#info-nome h4").textContent = nameOf(professor);
                row.querySelector("#info-nome p").textContent = "Tipo: " + typeOf(professor);
                row.querySelector("#info-email p").textContent = emailOf(professor);
                row.querySelector("#info-acoes button").addEventListener("click", function () {
                    var professorId = professor.id_usuario;
                    window.sessionStorage.setItem("sic_monitor_professor", professorId);
                    window.location.href = "monitoramento-de-professores.html?id_usuario=" + encodeURIComponent(professorId);
                });
                list.appendChild(row);
            });
            counter.textContent = "Exibindo " + filtered.length + " de " + professors.length + " professor(es)";
        }

        search.addEventListener("input", render);
        type.addEventListener("change", render);
        render();
    }

    function loadCoordinatorEvaluators() {
        var list = document.querySelector("#lista-avaliadores-api");
        var user = currentUser();
        if (!list || !user || userRole(user) !== "coordenador" || !api || !api.isConfigured()) return;

        var eventId = getEventId();
        var eventRequest = eventId ? Promise.resolve(eventId) : api.events.listByUser(userId(user)).then(function (response) {
            var events = normalizeEvents(response);
            return events[0] && events[0].id_evento;
        });

        eventRequest.then(function (selectedEventId) {
            if (!selectedEventId) throw new Error("Nenhum evento selecionado para listar os avaliadores.");
            window.localStorage.setItem("sic_current_event", selectedEventId);
            return api.professors.list(selectedEventId);
        }).then(function (response) {
            setupEvaluatorFilters(normalizeEvents(response), list);
        }).catch(showError);
    }

    function loadProfessorMonitoring() {
        var select = document.querySelector("#monitor-professor");
        var user = currentUser();
        if (!select || !user || userRole(user) !== "coordenador" || !api || !api.isConfigured()) return;

        var eventId = getEventId();
        if (!eventId) {
            select.innerHTML = "<option value=\"\">Selecione um evento no dashboard</option>";
            return;
        }

        api.professors.list(eventId).then(function (response) {
            var professors = normalizeEvents(response);
            select.innerHTML = "<option value=\"\">Selecione um professor</option>";
            professors.forEach(function (professor) {
                var option = document.createElement("option");
                option.value = professor.id_usuario;
                option.textContent = (professor.nome_usuario || professor.nome || "Sem nome") + " - ID " + professor.id_usuario;
                select.appendChild(option);
            });

            var params = new URLSearchParams(window.location.search);
            var selectedId = params.get("id_usuario") || window.sessionStorage.getItem("sic_monitor_professor");
            if (selectedId && professors.some(function (professor) { return String(professor.id_usuario) === String(selectedId); })) {
                select.value = selectedId;
                loadProfessorPanel(eventId, selectedId);
            }
        }).catch(showError);

        select.addEventListener("change", function () {
            if (!select.value) return;
            window.sessionStorage.setItem("sic_monitor_professor", select.value);
            window.history.replaceState({}, "", "monitoramento-de-professores.html?id_usuario=" + encodeURIComponent(select.value));
            loadProfessorPanel(eventId, select.value);
        });
    }

    function loadProfessorPanel(eventId, professorId) {
        api.professors.panel(eventId, professorId).then(function (panel) {
            var userData = panel.usuario || {};
            var eventData = panel.evento || {};
            var summary = panel.resumo || {};
            var projects = (panel.projetos || []).filter(function (project) { return project.avaliado; });
            document.querySelector("#monitor-nome").textContent = userData.nome_usuario || "Sem nome";
            document.querySelector("#monitor-tipo").textContent = "Professor vinculado ao evento";
            document.querySelector("#monitor-avaliador").textContent = userData.tipo_avaliador || "Não informado";
            document.querySelector("#monitor-email").textContent = userData.email || "Sem e-mail";
            document.querySelector("#monitor-id").textContent = userData.id_usuario || professorId;
            document.querySelector("#monitor-evento").textContent = eventData.nome_evento || "Evento selecionado";
            document.querySelector("#monitor-total-projetos").textContent = projects.length;
            document.querySelector("#monitor-pontuacao").textContent = summary.pontuacao_total || "0";

            var list = document.querySelector("#monitor-projetos");
            list.innerHTML = "";
            if (!projects.length) {
                list.innerHTML = "<p class=\"api-empty\">Este professor ainda não avaliou projetos neste evento.</p>";
                return;
            }
            projects.forEach(function (project) {
                var row = document.createElement("div");
                row.className = "lista1";
                row.innerHTML = "<h5></h5><span></span><p>Avaliado</p><span></span>";
                row.querySelector("h5").textContent = project.nome_projeto || "Sem nome";
                row.querySelector("h5").title = "Estande: " + (project.estande || "-");
                row.querySelector("span").textContent = "Estande " + (project.estande || "-");
                row.querySelectorAll("span")[1].textContent = project.avaliacao && project.avaliacao.pontuacao_total || "-";
                list.appendChild(row);
            });
        }).catch(showError);
    }

    function setupEvaluatorFilters(evaluators, list) {
        var search = document.querySelector("#busca-avaliador");
        var type = document.querySelector("#filtro-tipo-avaliador");
        var normalized = function (value) {
            return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        };
        var nameOf = function (evaluator) { return evaluator.nome_usuario || evaluator.nome || "Sem nome"; };
        var emailOf = function (evaluator) { return evaluator.email || "Sem e-mail"; };
        var typeOf = function (evaluator) { return evaluator.tipo_avaliador || "Não informado"; };
        var types = Array.from(new Set(evaluators.map(typeOf))).sort();

        type.innerHTML = "<option value=\"\">Todos os tipos</option>";
        types.forEach(function (value) {
            var option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            type.appendChild(option);
        });

        function render() {
            var term = normalized(search.value);
            var selectedType = normalized(type.value);
            var filtered = evaluators.filter(function (evaluator) {
                return (!term || normalized(nameOf(evaluator) + " " + emailOf(evaluator)).indexOf(term) !== -1) &&
                    (!selectedType || normalized(typeOf(evaluator)) === selectedType);
            });
            list.innerHTML = "";
            if (!filtered.length) {
                list.innerHTML = "<p class=\"api-empty\">Nenhum avaliador corresponde aos filtros.</p>";
            }
            filtered.forEach(function (evaluator) {
                var row = document.createElement("div");
                row.className = "registro";
                row.innerHTML = "<div class=\"info-nome\"><div class=\"perfil\"></div><div class=\"nome\"><h4></h4><p></p></div></div>" +
                    "<div class=\"info-email\"><p></p></div>" +
                    "<div class=\"info-projetos\"><span>Dados indisponíveis</span></div>" +
                    "<div class=\"info-status\"><div class=\"status ativo\"><span></span>Vinculado</div></div>" +
                    "<div class=\"info-acoes\"><button type=\"button\" disabled title=\"Detalhamento ainda não disponível\"><i class=\"fi fi-rr-eye\"></i></button></div>";
                row.querySelector(".info-nome h4").textContent = nameOf(evaluator);
                row.querySelector(".info-nome p").textContent = "Tipo: " + typeOf(evaluator);
                row.querySelector(".info-email p").textContent = emailOf(evaluator);
                list.appendChild(row);
            });
        }

        search.addEventListener("input", render);
        type.addEventListener("change", render);
        render();
    }

    function loadCoordinatorProjects() {
        var list = document.querySelector("#lista-projetos-api");
        var user = currentUser();
        if (!list || !user || userRole(user) !== "coordenador" || !api || !api.isConfigured()) return;

        var eventId = getEventId();
        var eventRequest = eventId ? Promise.resolve(eventId) : api.events.listByUser(userId(user)).then(function (response) {
            var events = normalizeEvents(response);
            return events[0] && events[0].id_evento;
        });

        eventRequest.then(function (selectedEventId) {
            if (!selectedEventId) throw new Error("Nenhum evento selecionado para listar os projetos.");
            window.localStorage.setItem("sic_current_event", selectedEventId);
            return api.projects.list(selectedEventId);
        }).then(function (response) {
            var projects = normalizeEvents(response);
            var lists = document.querySelectorAll(".box-main > .lista");
            lists.forEach(function (item, index) {
                if (index > 0) item.remove();
            });
            setupProjectFilters(projects, list);
        }).catch(showError);
    }

    function setupProjectFilters(projects, list) {
        var search = document.querySelector("#navegado");
        var category = document.querySelector("#filtro-categoria");
        var professor = document.querySelector("#filtro-professor");
        var status = document.querySelector("#filtro-status");
        var counter = document.querySelector("#projetos-contador");
        var normalized = function (value) {
            return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        };
        var categoryOf = function (project) { return project.categoria || project.categoria_projeto || "Projeto"; };
        var professorOf = function (project) { return project.professor || project.nome_professor || project.professor_nome || ""; };
        var statusOf = function (project) { return project.concluido ? "Concluído" : "Em avaliação"; };

        function addOptions(select, values, emptyLabel) {
            if (!select) return;
            select.innerHTML = "<option value=\"\">" + emptyLabel + "</option>";
            values.forEach(function (value) {
                var option = document.createElement("option");
                option.value = value;
                option.textContent = value;
                select.appendChild(option);
            });
        }

        addOptions(category, Array.from(new Set(projects.map(categoryOf))).sort(), "Todas as categorias");
        addOptions(professor, Array.from(new Set(projects.map(professorOf).filter(Boolean))).sort(), "Todos os professores");
        addOptions(status, Array.from(new Set(projects.map(statusOf))).sort(), "Todos os status");

        function render() {
            var term = normalized(search && search.value);
            var selectedCategory = normalized(category && category.value);
            var selectedProfessor = normalized(professor && professor.value);
            var selectedStatus = normalized(status && status.value);
            var filtered = projects.filter(function (project) {
                var content = normalized([project.nome_projeto, project.resumo, project.estande, project.id_projeto].join(" "));
                return (!term || content.indexOf(term) !== -1) &&
                    (!selectedCategory || normalized(categoryOf(project)) === selectedCategory) &&
                    (!selectedProfessor || normalized(professorOf(project)) === selectedProfessor) &&
                    (!selectedStatus || normalized(statusOf(project)) === selectedStatus);
            });

            list.innerHTML = "";
            if (!filtered.length) {
                list.innerHTML = "<p class=\"api-empty\">Nenhum projeto corresponde aos filtros.</p>";
            }
            filtered.forEach(function (project) {
                var row = document.createElement("div");
                row.className = "registro";
                row.innerHTML = "<div class=\"info inf\"><div class=\"nome\"><h4></h4><p></p></div></div>" +
                    "<div class=\"categoria inf\"></div>" +
                    "<div class=\"professores inf\"><p></p></div>" +
                    "<div class=\"status inf\"><p></p></div>" +
                    "<div class=\"pontuacao inf\"><p></p></div>";
                row.querySelector("h4").textContent = project.nome_projeto || "Sem nome";
                row.querySelector(".nome p").textContent = "ID: " + project.id_projeto;
                row.querySelector(".categoria").textContent = categoryOf(project);
                row.querySelector(".professores p").textContent = professorOf(project) || (project.total_avaliaram || 0) + "/" + (project.total_avaliadores || 0) + " avaliações";
                row.querySelector(".status p").textContent = statusOf(project);
                row.querySelector(".pontuacao p").textContent = project.pontuacao_total || "-";
                list.appendChild(row);
            });
            if (counter) counter.textContent = "Exibindo " + filtered.length + " de " + projects.length + " projeto(s)";
        }

        [search, category, professor, status].forEach(function (control) {
            if (control) control.addEventListener("input", render);
        });
        render();
    }

    function loadCoordinatorEventSelector() {
        var select = document.querySelector("#evento-coordenador");
        var user = currentUser();
        if (!select || !user || userRole(user) !== "coordenador" || !api || !api.isConfigured()) return;

        api.events.listByUser(userId(user)).then(function (response) {
            var events = normalizeEvents(response);
            select.innerHTML = "<option value=\"\">Selecione o evento</option>";
            events.forEach(function (event) {
                var option = document.createElement("option");
                option.value = event.id_evento;
                option.textContent = event.nome_evento;
                select.appendChild(option);
            });

            var currentEvent = window.localStorage.getItem("sic_current_event");
            if (!currentEvent && events.length) {
                currentEvent = String(events[0].id_evento);
                window.localStorage.setItem("sic_current_event", currentEvent);
            }
            if (currentEvent) select.value = currentEvent;
        }).catch(showError);

        select.addEventListener("change", function () {
            if (!select.value) return;
            window.localStorage.setItem("sic_current_event", select.value);
            window.location.reload();
        });
    }

    function enforceRoleAccess() {
        var page = window.location.pathname.toLowerCase().split("/").pop();
        if (page === "login.html" || page === "index.html" || !api) return;

        var user = currentUser();
        if (!user || !api.auth.getToken()) {
            window.location.href = "login.html";
            return;
        }

        var role = userRole(user);
        var professorPages = [
            "home.html",
            "escolher-evento.html",
            "projetos-avaliar.html",
            "formulario.html",
            "avaliacao-enviada.html"
        ];
        var coordinatorPages = [
            "pagina-principal.html",
            "criar-projeto.html",
            "pagina-professor.html",
            "pagina-avaliadores.html",
            "visualizar-projeto.html",
            "ranking.html",
            "registrar-novo-professor.html"
            ,"monitoramento-de-professores.html"
        ];
        if (role === "professor" && coordinatorPages.indexOf(page) !== -1) {
            window.location.href = "home.html";
        } else if (role === "coordenador" && professorPages.indexOf(page) !== -1) {
            window.location.href = "Pagina-principal.html";
        } else if (role === "professor" && page !== "escolher-evento.html" && !getEventId()) {
            window.location.href = "escolher-evento.html";
        } else if (role !== "professor" && role !== "coordenador") {
            api.auth.logout();
            window.location.href = "login.html";
        }
    }

    function showError(error) {
        if (error && error.status === 401) {
            api.auth.logout();
            window.location.href = "login.html";
            return;
        }
        window.alert(error && error.message || "Não foi possível concluir a operação.");
    }

    function loadProfessorProjects() {
        var user = currentUser();
        if (!user || !api || !api.isConfigured()) return;

        var eventId = getEventId();
        var eventRequest = eventId ? Promise.resolve({ id_evento: eventId }) : api.events.listByUser(userId(user));
        eventRequest.then(function (event) {
            event = firstEvent(event);
            if (!event || !event.id_evento) throw new Error("Nenhum evento vinculado ao usuário.");
            window.localStorage.setItem("sic_current_event", event.id_evento);
            return api.projects.listNotEvaluated(event.id_evento, userId(user));
        }).then(renderProfessorProjects).catch(showError);
    }

        function loadProfessorHome() {
            var user = currentUser();
            if (!document.querySelector(".avaliador") || !user || !getEventId() || !api || !api.isConfigured()) return;

            api.professors.panel(getEventId(), userId(user)).then(function (panel) {
                var summary = panel.resumo || {};
                var userData = panel.usuario || {};
                var eventData = panel.evento || {};
                var greeting = document.querySelector(".ola");
                var eventLabel = document.querySelector(".avaliador-ofc-sic");
                if (greeting) greeting.textContent = "Olá, " + (userData.nome_usuario || userData.nome || "Avaliador") + "!";
                if (eventLabel) eventLabel.textContent = (eventData.nome_evento || "Evento selecionado") + " · " + (userData.tipo_avaliador || "Avaliador");
                document.querySelector(".numero-p-avaliar").textContent = summary.total_projetos || 0;
                document.querySelector(".numero-realizadas").textContent = summary.total_avaliados || 0;
                document.querySelector(".numero-pendente").textContent = summary.total_nao_avaliados || 0;
                document.querySelector(".porcentagem-progressso").textContent = summary.total_projetos ? Math.round((summary.total_avaliados / summary.total_projetos) * 100) + "%" : "0%";
                var score = document.querySelector(".pontuacao-total");
                if (score) score.textContent = panel.resumo.pontuacao_total || "0";
            }).catch(showError);
        }

    function renderProfessorProjects(projects) {
        var main = document.querySelector(".projetos-lista-api");
        if (!main) return;
        main.innerHTML = "";
        if (!projects || !projects.length) {
            main.innerHTML = "<p class=\"api-empty\">Nenhum projeto pendente para avaliação.</p>";
            return;
        }
        projects.forEach(function (project) {
            var article = document.createElement("div");
            article.className = "projeto-braço";
            article.innerHTML = "<p class=\"materia\">Projeto</p>" +
                "<p class=\"status\">Pendente</p>" +
                "<h3></h3><p class=\"resumo-api\"></p>" +
                "<div class=\"avaliar\"><button type=\"button\"><i class=\"fa-solid fa-list\"></i><span>Avaliar</span></button></div>";
            article.querySelector("h3").textContent = project.nome_projeto;
            article.querySelector(".resumo-api").textContent = project.resumo || "";
            article.querySelector("button").addEventListener("click", function () {
                window.localStorage.setItem("sic_current_project", project.id_projeto);
                window.location.href = "formulario.html";
            });
            main.appendChild(article);
        });
    }

    function loadCoordinatorDashboard() {
        if (!document.querySelector("#secao-dashboard") || !api || !api.isConfigured()) return;
        var user = currentUser();
        if (!user) return;
        var eventId = getEventId();
        var eventRequest = eventId ? Promise.resolve({ id_evento: eventId }) : api.events.listByUser(userId(user));
        eventRequest.then(function (event) {
            event = firstEvent(event);
            if (!event || !event.id_evento) throw new Error("Nenhum evento vinculado ao usuário.");
            window.localStorage.setItem("sic_current_event", event.id_evento);
            return api.events.dashboard(event.id_evento);
        }).then(function (dashboard) {
            var summary = dashboard.resumo || {};
            var eventData = dashboard.evento || {};
            var cards = document.querySelectorAll("#secao-dashboard .projetos .card .number h2");
            if (cards[0]) cards[0].textContent = summary.total_projetos || 0;
            if (cards[1]) cards[1].textContent = summary.total_avaliacoes || 0;
            if (cards[2]) cards[2].textContent = summary.projetos_avaliados || 0;
            if (cards[3]) cards[3].textContent = summary.projetos_pendentes || 0;
            var percentage = document.querySelector("#secao-dashboard .porcentagem h3");
            if (percentage) percentage.textContent = (summary.percentual_conclusao || 0) + "%";
            var title = document.querySelector(".cabeca > h2");
            var subtitle = document.querySelector(".cabeca > p");
            if (title && eventData.nome_evento) title.textContent = eventData.nome_evento;
            if (subtitle && eventData.status) subtitle.textContent = "Status: " + eventData.status;
        }).catch(showError);
    }

    var routes = {
        dashboard: "Pagina-principal.html",
        projetos: "Visualizar-projeto.html",
        professores: "Pagina-professor.html",
        rank: "ranking.html",
        avaliadores: "pagina-avaliadores.html",
        voltar: "Pagina-principal.html",
        inicio: "home.html",
        avaliacoes: "projetos-avaliar.html",
        perfil: "login.html"
    };

    enforceRoleAccess();

    function normalize(value) {
        return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    }

    function routeFor(label) {
        var key = normalize(label).replace(/[^a-z]/g, "");
        return routes[key];
    }

    document.querySelectorAll("#navegador .btn, footer .inicio, footer .projetos, footer .avaliaçoes, footer .perfil").forEach(function (control) {
        var destination = routeFor(control.textContent);
        if (!destination) return;

        if (control.closest("footer") && (control.classList.contains("projetos") || control.classList.contains("avaliaçoes"))) {
            destination = "projetos-avaliar.html";
        }

        control.type = "button";
        control.addEventListener("click", function () {
            window.location.href = destination;
        });

        if (destination === window.location.pathname.split("/").pop()) {
            control.setAttribute("aria-current", "page");
        }
    });

    document.querySelectorAll("a[href^=\"http://127.0.0.1\"]").forEach(function (link) {
        link.href = "Pagina-principal.html";
    });

    document.querySelectorAll("a[href=\"#\"]").forEach(function (link) {
        var label = normalize(link.textContent);
        link.href = label.indexOf("professor") !== -1 ? "Pagina-professor.html" : "Visualizar-projeto.html";
    });

    document.querySelectorAll(".avaliar button").forEach(function (control) {
        control.addEventListener("click", function () {
            var project = control.closest("[data-project-id]");
            if (project) window.localStorage.setItem("sic_current_project", project.dataset.projectId);
            window.location.href = "formulario.html";
        });
    });

    if (document.querySelector("#eventos-disponiveis")) loadEventSelection();
    if (document.querySelector("#evento-projeto")) loadProjectEventOptions();
    if (document.querySelector("#evento-coordenador")) loadCoordinatorEventSelector();
    if (document.querySelector("#lista-professores-api")) loadCoordinatorProfessors();
    if (document.querySelector("#lista-avaliadores-api")) loadCoordinatorEvaluators();
    if (document.querySelector("#monitor-professor")) loadProfessorMonitoring();
    if (document.querySelector("#lista-projetos-api")) loadCoordinatorProjects();
    if (document.querySelector(".projetos-lista-api")) loadProfessorProjects();
    loadProfessorHome();
    loadCoordinatorDashboard();

    var saveProjectButton = document.querySelector("#button-arquivo");
    if (saveProjectButton && api && api.isConfigured()) {
        saveProjectButton.addEventListener("click", function () {
            var eventId = document.querySelector("#evento-projeto").value;
            var name = document.querySelector("#nome-projeto").value.trim();
            var summary = document.querySelector("#resumo-projeto").value.trim();
            var stand = document.querySelector("#estande-projeto").value.trim();
            if (!eventId || !name || !summary || !stand) {
                window.alert("Informe o evento, o nome, o resumo e o estande do projeto.");
                return;
            }
            window.localStorage.setItem("sic_current_event", eventId);
            saveProjectButton.disabled = true;
            api.projects.create({
                id_evento: Number(eventId),
                nome_projeto: name,
                resumo: summary,
                estande: stand
            }).then(function () {
                window.location.href = "Visualizar-projeto.html";
            }).catch(function (error) {
                saveProjectButton.disabled = false;
                showError(error);
            });
        });
    }

    var registerProfessorButton = document.querySelector("#registrar-professor");
    if (registerProfessorButton && api && api.isConfigured()) {
        registerProfessorButton.addEventListener("click", function () {
            var eventId = getEventId();
            var name = document.querySelector("#professor-nome").value.trim();
            var email = document.querySelector("#professor-email").value.trim();
            var type = document.querySelector("#professor-tipo").value;
            var password = document.querySelector("#professor-senha").value;
            if (!eventId || !name || !email || !type || !password) {
                window.alert("Preencha todos os dados do professor.");
                return;
            }
            registerProfessorButton.disabled = true;
            api.auth.register({
                nome: name,
                email: email,
                senha: password,
                tipo_usuario: "professor",
                tipo_avaliador: type,
                eventos: [Number(eventId)]
            }).then(function () {
                window.location.href = "Pagina-professor.html";
            }).catch(function (error) {
                registerProfessorButton.disabled = false;
                showError(error);
            });
        });
    }

    document.querySelectorAll(".enviar button").forEach(function (control) {
        control.addEventListener("click", function () {
            if (window.SICApi && window.SICApi.isConfigured()) {
                var form = control.closest("main");
                var scores = {};
                form.querySelectorAll('input[type="radio"]:checked').forEach(function (input) {
                    scores[input.name] = Number(input.value);
                });

                if (["criatividade", "metodologia", "relevancia", "apresentacao", "nota5", "nota6"].some(function (criterion) {
                    return typeof scores[criterion] !== "number";
                })) {
                    window.alert("Selecione uma nota para todos os critérios.");
                    return;
                }

                var projectId = Number(window.localStorage.getItem("sic_current_project") || form.dataset.projectId);
                if (!Number.isInteger(projectId) || projectId <= 0) {
                    window.alert("Não foi possível identificar o projeto que será avaliado.");
                    return;
                }

                control.disabled = true;
                window.SICApi.evaluations.submit({
                    id_projeto: projectId,
                    notas: [scores.criatividade, scores.metodologia, scores.relevancia, scores.apresentacao, scores.nota5, scores.nota6],
                    comentario: form.querySelector("#observacoes").value
                }).then(function (result) {
                    window.sessionStorage.setItem("sic_last_review", JSON.stringify(result || {}));
                    window.location.href = "avaliacao-enviada.html";
                }).catch(function (error) {
                    control.disabled = false;
                    showError(error);
                });
                return;
            }

            window.location.href = "avaliacao-enviada.html";
        });
    });

    document.querySelectorAll(".Ver, #btn-prof, #btn-novo-projeto").forEach(function (control) {
        control.type = "button";
        control.addEventListener("click", function () {
            if (control.id === "btn-prof") {
                window.location.href = "registrar-novo-professor.html";
            } else if (control.id === "btn-novo-projeto") {
                window.location.href = "Criar-projeto.html";
            } else {
                window.location.href = "projetos-avaliar.html";
            }
        });
    });

    document.querySelectorAll("form").forEach(function (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();

            if (form.closest(".login-card") && window.SICApi && window.SICApi.isConfigured()) {
                var submit = form.querySelector("button[type=submit]");
                submit.disabled = true;
                window.SICApi.auth.login({
                    email: form.querySelector("#email").value,
                    senha: form.querySelector("#senha").value
                }).then(function (session) {
                    var role = session && (session.data || session.user) && ((session.data || session.user).tipo_usuario || (session.data || session.user).role);
                    if (role === "professor") {
                        window.location.href = "escolher-evento.html";
                    } else if (role === "coordenador") {
                        window.location.href = "Pagina-principal.html";
                    } else {
                        throw new Error("O tipo de usuário retornado pela API é inválido.");
                    }
                }).catch(function (error) {
                    submit.disabled = false;
                    window.alert(error.message);
                });
                return;
            }

            var target = form.closest(".login-card") ? "home.html" :
                (window.location.pathname.toLowerCase().indexOf("registrar") !== -1 ? "Pagina-professor.html" : "Visualizar-projeto.html");
            window.location.href = target;
        });
    });
}());