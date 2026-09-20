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
            if (select.value) select.dispatchEvent(new Event("change"));
        }).catch(showError);
    }

    function loadProjectEvaluatorOptions() {
        var eventSelect = document.querySelector("#evento-projeto");
        var evaluatorSelect = document.querySelector("#avaliadores-projeto");
        if (!eventSelect || !evaluatorSelect || !api || !api.isConfigured()) return;

        function load(eventId) {
            evaluatorSelect.innerHTML = "";
            evaluatorSelect.disabled = true;
            if (!eventId) {
                evaluatorSelect.innerHTML = "<option value=\"\">Selecione primeiro um evento</option>";
                return;
            }

            evaluatorSelect.innerHTML = "<option value=\"\">Carregando professores...</option>";
            api.professors.list(eventId).then(function (response) {
                var professors = normalizeEvents(response);
                evaluatorSelect.innerHTML = "";
                if (!professors.length) {
                    evaluatorSelect.innerHTML = "<option value=\"\">Nenhum professor vinculado a este evento</option>";
                    return;
                }
                professors.forEach(function (professor) {
                    var option = document.createElement("option");
                    option.value = professor.id_usuario;
                    option.textContent = (professor.nome_usuario || professor.nome || "Sem nome") +
                        " - " + (professor.tipo_avaliador || "tipo não informado");
                    evaluatorSelect.appendChild(option);
                });
                evaluatorSelect.disabled = false;
            }).catch(function (error) {
                evaluatorSelect.innerHTML = "<option value=\"\">Não foi possível carregar os professores</option>";
                showError(error);
            });
        }

        eventSelect.addEventListener("change", function () {
            load(eventSelect.value);
        });
        if (eventSelect.value) load(eventSelect.value);
    }

    function loadProjectCategoryOptions() {
        var select = document.querySelector("#categoria-projeto");
        if (!select || !api || !api.isConfigured()) return;

        api.categories.list().then(function (response) {
            var categories = Array.isArray(response) ? response : (response && response.data) || [];
            select.innerHTML = "<option value=\"\">Selecione a categoria</option>";
            categories.forEach(function (category) {
                var option = document.createElement("option");
                option.value = category.id_categoria;
                option.textContent = category.nome_categoria;
                select.appendChild(option);
            });
        }).catch(showError);
    }

    function loadProfessorEventOptions() {
        var container = document.querySelector("#professor-eventos");
        var user = currentUser();
        if (!container || !user || !api || !api.isConfigured()) return;

        api.events.listByUser(userId(user)).then(function (response) {
            var events = normalizeEvents(response);
            container.innerHTML = "";
            if (!events.length) {
                container.innerHTML = "<p class=\"eventos-vazio\">Nenhum evento disponível.</p>";
                return;
            }
            events.forEach(function (event) {
                var label = document.createElement("label");
                var checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.value = event.id_evento;
                label.className = "evento-opcao";
                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(event.nome_evento + " - " + event.status));
                container.appendChild(label);
            });
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

    function getCoordinatorEvents() {
        var user = currentUser();
        return api.events.listByUser(userId(user)).then(function (response) {
            return normalizeEvents(response);
        });
    }

    function modalElement() {
        var dialog = document.querySelector("#sic-modal");
        if (dialog) return dialog;
        dialog = document.createElement("dialog");
        dialog.id = "sic-modal";
        dialog.innerHTML = "<div class=\"sic-modal-box\"><div class=\"sic-modal-header\"><h2></h2><button type=\"button\" class=\"sic-modal-close\" aria-label=\"Fechar\">×</button></div><div class=\"sic-modal-content\"></div></div>";
        document.body.appendChild(dialog);
        dialog.querySelector(".sic-modal-close").addEventListener("click", function () { dialog.close(); });
        dialog.addEventListener("click", function (event) {
            if (event.target === dialog) dialog.close();
        });
        return dialog;
    }

    function openModal(title, content, onSubmit) {
        var dialog = modalElement();
        var contentElement = dialog.querySelector(".sic-modal-content");
        dialog.querySelector(".sic-modal-header h2").textContent = title;
        contentElement.innerHTML = "";
        contentElement.appendChild(content);
        dialog.showModal();
        var firstInput = content.querySelector("input, select, textarea");
        if (firstInput) window.setTimeout(function () { firstInput.focus(); }, 0);
        var form = content.querySelector("form");
        if (form) form.addEventListener("submit", function (event) {
            event.preventDefault();
            onSubmit(form, dialog);
        });
    }

    function confirmAction(message, onConfirm) {
        var content = document.createElement("div");
        content.innerHTML = "<p class=\"sic-modal-message\"></p><div class=\"sic-modal-actions\"><button type=\"button\" class=\"sic-btn-ghost\" data-cancel>Cancelar</button><button type=\"button\" class=\"sic-btn-danger\" data-confirm>Excluir</button></div>";
        content.querySelector(".sic-modal-message").textContent = message;
        openModal("Confirmar exclusão", content, function () {});
        var dialog = modalElement();
        content.querySelector("[data-cancel]").addEventListener("click", function () { dialog.close(); });
        content.querySelector("[data-confirm]").addEventListener("click", function () {
            var button = content.querySelector("[data-confirm]");
            button.disabled = true;
            Promise.resolve(onConfirm()).then(function () { dialog.close(); }).catch(function () { button.disabled = false; });
        });
    }

    function emailIsValid(input) {
        input.value = String(input.value || "").trim().toLowerCase();
        input.setCustomValidity("");
        if (!input.value || !input.validity.valid || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
            input.setCustomValidity("Informe um e-mail válido.");
            return false;
        }
        return true;
    }

    function professorEditModal(professor, refresh) {
        var content = document.createElement("div");
        content.innerHTML = "<form class=\"sic-modal-form\"><label>Nome<input name=\"nome\" required></label><label>E-mail<input name=\"email\" type=\"email\" required></label><label>Tipo de avaliador<select name=\"tipo\" required><option value=\"tecnico\">Técnico</option><option value=\"artistico\">Artístico</option></select></label><label>Nova senha <small>(opcional)</small><input name=\"senha\" type=\"password\"></label><fieldset><legend>Eventos vinculados</legend><div class=\"sic-event-list\">Carregando...</div></fieldset><div class=\"sic-modal-actions\"><button type=\"button\" class=\"sic-btn-ghost\" data-cancel>Cancelar</button><button type=\"submit\">Salvar alterações</button></div></form>";
        var form = content.querySelector("form");
        form.nome.value = professor.nome_usuario || professor.nome || "";
        form.email.value = professor.email || "";
        form.tipo.value = professor.tipo_avaliador || "tecnico";
        content.querySelector("[data-cancel]").addEventListener("click", function () { modalElement().close(); });
        getCoordinatorEvents().then(function (events) {
            var eventList = content.querySelector(".sic-event-list");
            eventList.innerHTML = "";
            events.forEach(function (event) {
                var label = document.createElement("label");
                label.innerHTML = "<input type=\"checkbox\" name=\"eventos\"> <span></span>";
                label.querySelector("input").value = event.id_evento;
                label.querySelector("input").checked = Array.isArray(professor.eventos) && professor.eventos.some(function (id) { return String(id) === String(event.id_evento); });
                label.querySelector("span").textContent = event.nome_evento;
                eventList.appendChild(label);
            });
        }).catch(showError);
        openModal("Editar professor", content, function (submittedForm, dialog) {
            if (!emailIsValid(submittedForm.email) || !submittedForm.checkValidity()) return;
            var events = Array.from(submittedForm.querySelectorAll("input[name=eventos]:checked")).map(function (input) { return Number(input.value); });
            if (!events.length) { window.alert("Selecione pelo menos um evento."); return; }
            var payload = { nome: submittedForm.nome.value.trim(), email: submittedForm.email.value, tipo_avaliador: submittedForm.tipo.value, eventos: events };
            if (submittedForm.senha.value) payload.senha = submittedForm.senha.value;
            api.auth.updateProfessor(professor.id_usuario, payload).then(function () { dialog.close(); refresh(); }).catch(showError);
        });
    }

    function projectEditModal(project, categories, events, refresh) {
        var content = document.createElement("div");
        content.innerHTML = "<form class=\"sic-modal-form\"><label>Nome<input name=\"nome\" required></label><label>Resumo<textarea name=\"resumo\" required></textarea></label><label>Evento<select name=\"evento\" required></select></label><label>Categoria<select name=\"categoria\" required></select></label><label>Estande<input name=\"estande\" required></label><div class=\"sic-modal-actions\"><button type=\"button\" class=\"sic-btn-ghost\" data-cancel>Cancelar</button><button type=\"submit\">Salvar alterações</button></div></form>";
        var form = content.querySelector("form");
        form.nome.value = project.nome_projeto || "";
        form.resumo.value = project.resumo || "";
        form.estande.value = project.estande || "";
        events.forEach(function (event) { form.evento.add(new Option(event.nome_evento, event.id_evento)); });
        categories.forEach(function (category) { form.categoria.add(new Option(category.nome_categoria, category.id_categoria)); });
        form.evento.value = project.id_evento;
        form.categoria.value = project.id_categoria;
        content.querySelector("[data-cancel]").addEventListener("click", function () { modalElement().close(); });
        openModal("Editar projeto", content, function (submittedForm, dialog) {
            if (!submittedForm.checkValidity()) { submittedForm.reportValidity(); return; }
            api.projects.update(project.id_projeto, { id_evento: Number(submittedForm.evento.value), id_categoria: Number(submittedForm.categoria.value), nome_projeto: submittedForm.nome.value.trim(), resumo: submittedForm.resumo.value.trim(), estande: submittedForm.estande.value.trim() }).then(function () { dialog.close(); refresh(); }).catch(showError);
        });
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
                    "<div class=\"info\" id=\"info-acoes\"><button type=\"button\" title=\"Monitorar professor\"><i class=\"fi fi-rr-eye\"></i></button><button type=\"button\" title=\"Editar professor\"><i class=\"fi fi-rr-pencil\"></i></button><button type=\"button\" class=\"acao-perigo\" title=\"Excluir professor\"><i class=\"fi fi-rr-trash\"></i></button></div>";
                row.querySelector("#info-nome h4").textContent = nameOf(professor);
                row.querySelector("#info-nome p").textContent = "Tipo: " + typeOf(professor);
                row.querySelector("#info-email p").textContent = emailOf(professor);
                var actions = row.querySelectorAll("#info-acoes button");
                actions[0].addEventListener("click", function () {
                    var professorId = professor.id_usuario;
                    window.sessionStorage.setItem("sic_monitor_professor", professorId);
                    window.location.href = "monitoramento-de-professores.html?id_usuario=" + encodeURIComponent(professorId);
                });
                actions[1].addEventListener("click", function () { professorEditModal(professor, loadCoordinatorProfessors); });
                actions[2].addEventListener("click", function () {
                    confirmAction("Excluir " + nameOf(professor) + "? Professores com avaliações não podem ser excluídos.", function () {
                        return api.auth.remove(professor.id_usuario).then(loadCoordinatorProfessors).catch(function (error) {
                            showError(error);
                            throw error;
                        });
                    });
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

        Promise.all([api.professors.list(eventId), api.projects.list(eventId)]).then(function (responses) {
            var professors = normalizeEvents(responses[0]);
            var projects = normalizeEvents(responses[1]);
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
            }
            return loadMonitoringCriteria(professors, select.value).then(function (criteriaByType) {
                renderMonitoring(eventId, professors, projects, select.value, criteriaByType);
            });
        }).catch(showError);

        select.addEventListener("change", function () {
            var selectedId = select.value;
            if (selectedId) {
                window.sessionStorage.setItem("sic_monitor_professor", selectedId);
                window.history.replaceState({}, "", "monitoramento-de-professores.html?id_usuario=" + encodeURIComponent(selectedId));
            } else {
                window.sessionStorage.removeItem("sic_monitor_professor");
                window.history.replaceState({}, "", "monitoramento-de-professores.html");
            }
            Promise.all([api.professors.list(eventId), api.projects.list(eventId)]).then(function (responses) {
                var professors = normalizeEvents(responses[0]);
                return loadMonitoringCriteria(professors, selectedId).then(function (criteriaByType) {
                    renderMonitoring(eventId, professors, normalizeEvents(responses[1]), selectedId, criteriaByType);
                });
            }).catch(showError);
        });
    }

    function loadMonitoringCriteria(professors, selectedProfessorId) {
        var professorByType = {};
        professors.forEach(function (professor) {
            var type = String(professor.tipo_avaliador || "").toLowerCase();
            if (type && (!professorByType[type] || String(professor.id_usuario) === String(selectedProfessorId))) {
                professorByType[type] = professor;
            }
        });
        var criteriaByType = {};
        return Promise.all(Object.keys(professorByType).map(function (type) {
            return api.criteria.list(professorByType[type].id_usuario).then(function (response) {
                var criteria = Array.isArray(response) ? response : (response && response.data) || [];
                criteriaByType[type] = criteria
                    .filter(function (criterion) {
                        return String(criterion.tipo_avaliador || type).toLowerCase() === type;
                    })
                    .sort(function (first, second) {
                        return Number(first.numero_criterio) - Number(second.numero_criterio);
                    });
            }).catch(function (error) {
                criteriaByType[type] = [];
                if (selectedProfessorId && String(professorByType[type].id_usuario) === String(selectedProfessorId)) {
                    throw error;
                }
            });
        })).then(function () {
            return criteriaByType;
        });
    }

    function renderMonitoring(eventId, professors, projects, selectedProfessorId, criteriaByType) {
        var professorById = {};
        professors.forEach(function (professor) {
            professorById[String(professor.id_usuario)] = professor;
        });

        var selectedProfessor = selectedProfessorId && professorById[String(selectedProfessorId)];
        var evaluations = [];
        projects.forEach(function (project) {
            (project.avaliacoes || []).forEach(function (evaluation) {
                if (!selectedProfessorId || String(evaluation.id_avaliador) === String(selectedProfessorId)) {
                    var evaluator = professorById[String(evaluation.id_avaliador)] || {};
                    evaluations.push({
                        project: project,
                        evaluation: evaluation,
                        evaluator: evaluator,
                        type: String(evaluator.tipo_avaliador || "não informado").toLowerCase()
                    });
                }
            });
        });

        var profile = selectedProfessor || {};
        document.querySelector("#monitor-nome").textContent = selectedProfessor ? profile.nome_usuario || "Sem nome" : "Todos os professores";
        document.querySelector("#monitor-tipo").textContent = selectedProfessor ? "Professor vinculado ao evento" : "Visão consolidada do evento";
        document.querySelector("#monitor-avaliador").textContent = selectedProfessor ? profile.tipo_avaliador || "Não informado" : "Todos os avaliadores";
        document.querySelector("#monitor-email").textContent = selectedProfessor ? profile.email || "Sem e-mail" : "Todas as avaliações";
        document.querySelector("#monitor-id").textContent = selectedProfessor ? profile.id_usuario : "-";
        document.querySelector("#monitor-evento").textContent = "Evento " + eventId;
        document.querySelector("#monitor-total-projetos").textContent = evaluations.length;
        document.querySelector("#monitor-pontuacao").textContent = evaluations.reduce(function (total, item) {
            return total + (Number(item.evaluation.pontuacao_total) || 0);
        }, 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

        var list = document.querySelector("#monitor-projetos");
        list.innerHTML = "";
        if (!evaluations.length) {
            list.innerHTML = "<p class=\"api-empty\">Nenhuma avaliação encontrada neste evento.</p>";
            return;
        }
        var groupedEvaluations = {};
        evaluations.forEach(function (item) {
            if (!groupedEvaluations[item.type]) groupedEvaluations[item.type] = [];
            groupedEvaluations[item.type].push(item);
        });
        Object.keys(groupedEvaluations).sort().forEach(function (type) {
            var group = document.createElement("section");
            group.className = "monitor-grupo";
            var title = document.createElement("h4");
            title.className = "monitor-grupo-titulo";
            title.textContent = type === "artistico" ? "Avaliações artísticas" : type === "tecnico" ? "Avaliações técnicas" : "Avaliações - " + type;
            group.appendChild(title);

            var criteria = (criteriaByType && criteriaByType[type]) || [];
            if (!criteria.length) {
                var unavailable = document.createElement("p");
                unavailable.className = "api-empty";
                unavailable.textContent = "Nenhum critério retornado para este tipo de avaliador.";
                group.appendChild(unavailable);
                list.appendChild(group);
                return;
            }
            var criterionNames = criteria.map(function (criterion) {
                return criterion.nome_criterio;
            });
            group.style.setProperty("--monitor-criterion-count", criterionNames.length);
            var header = document.createElement("div");
            header.className = "monitor-cabecalho";
            ["Projeto", "Categoria", "Avaliador"].concat(criterionNames, ["Total"]).forEach(function (label) {
                var cell = document.createElement("span");
                cell.textContent = label;
                header.appendChild(cell);
            });
            group.appendChild(header);

            groupedEvaluations[type].forEach(function (item) {
                var project = item.project;
                var evaluation = item.evaluation;
                var row = document.createElement("div");
                row.className = "lista1";
                row.title = evaluation.comentario || "Sem comentário";
                row.innerHTML = "<h5></h5><span></span><span></span>" +
                    criteria.map(function () { return "<span></span>"; }).join("") +
                    "<strong></strong>";
                row.querySelector("h5").textContent = project.nome_projeto || "Sem nome";
                row.querySelector("h5").title = evaluation.comentario || "Sem comentário";
                row.querySelectorAll("span")[0].textContent = project.nome_categoria || "Sem categoria";
                row.querySelectorAll("span")[1].textContent = item.evaluator.nome_usuario || ("ID " + (evaluation.id_avaliador || "-"));
                criteria.forEach(function (criterion, index) {
                    row.querySelectorAll("span")[index + 2].textContent = evaluation["nota" + (index + 1)] || "-";
                });
                row.querySelector("strong").textContent = evaluation.pontuacao_total || "0";
                group.appendChild(row);
            });
            list.appendChild(group);
        });
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
            return Promise.all([
                api.projects.list(selectedEventId),
                api.professors.list(selectedEventId),
                api.assignments.list(selectedEventId),
                api.categories.list(),
                getCoordinatorEvents()
            ]).then(function (responses) {
                return {
                    eventId: selectedEventId,
                    projects: normalizeEvents(responses[0]),
                    professors: normalizeEvents(responses[1]),
                    assignments: Array.isArray(responses[2]) ? responses[2] : (responses[2] && (responses[2].data || responses[2].atribuicoes)) || [],
                    categories: Array.isArray(responses[3]) ? responses[3] : (responses[3] && responses[3].data) || [],
                    events: normalizeEvents(responses[4])
                };
            });
        }).then(function (data) {
            var lists = document.querySelectorAll(".box-main > .lista");
            lists.forEach(function (item, index) {
                if (index > 0) item.remove();
            });
            setupProjectFilters(data.projects, list, data.professors, data.assignments, data.eventId, data.categories, data.events);
        }).catch(showError);
    }

    function setupProjectFilters(projects, list, professors, assignments, eventId, categories, events) {
        var search = document.querySelector("#navegado");
        var category = document.querySelector("#filtro-categoria");
        var professor = document.querySelector("#filtro-professor");
        var status = document.querySelector("#filtro-status");
        var counter = document.querySelector("#projetos-contador");
        var normalized = function (value) {
            return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        };
        var categoryOf = function (project) { return project.nome_categoria || project.categoria || project.categoria_projeto || "Projeto"; };
        var assignmentProjectId = function (assignment) { return assignment.id_projeto || assignment.projeto_id || (assignment.projeto && assignment.projeto.id_projeto); };
        var assignmentEvaluatorId = function (assignment) { return assignment.id_avaliador || assignment.avaliador_id || (assignment.avaliador && (assignment.avaliador.id_usuario || assignment.avaliador.id)); };
        var evaluatorName = function (evaluator) { return evaluator.nome_usuario || evaluator.nome || "ID " + evaluator.id_usuario; };
        var assignmentsFor = function (project) {
            return assignments.filter(function (assignment) {
                return String(assignmentProjectId(assignment)) === String(project.id_projeto);
            });
        };
        var professorOf = function (project) {
            var assigned = assignmentsFor(project);
            return assigned.map(function (assignment) {
                var evaluator = professors.find(function (professor) {
                    return String(professor.id_usuario) === String(assignmentEvaluatorId(assignment));
                });
                return evaluator ? evaluatorName(evaluator) : "ID " + assignmentEvaluatorId(assignment);
            }).join(", ");
        };
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
                    "<div class=\"atribuicoes inf\"></div>" +
                    "<div class=\"status inf\"><p></p></div>" +
                    "<div class=\"pontuacao inf\"><p></p></div>" +
                    "<div class=\"acoes-projeto inf\"></div>";
                row.querySelector("h4").textContent = project.nome_projeto || "Sem nome";
                row.querySelector(".nome p").textContent = "ID: " + project.id_projeto;
                row.querySelector(".categoria").textContent = categoryOf(project);
                row.querySelector(".professores p").textContent = professorOf(project) || (project.total_avaliaram || 0) + "/" + (project.total_avaliadores || 0) + " avaliações";
                row.querySelector(".status p").textContent = statusOf(project);
                row.querySelector(".pontuacao p").textContent = project.pontuacao_total || "-";
                renderAssignments(row.querySelector(".atribuicoes"), project);
                renderProjectActions(row.querySelector(".acoes-projeto"), project);
                list.appendChild(row);
            });
            if (counter) counter.textContent = "Exibindo " + filtered.length + " de " + projects.length + " projeto(s)";
        }

        function renderProjectActions(container, project) {
            var edit = document.createElement("button");
            edit.type = "button";
            edit.title = "Editar projeto";
            edit.innerHTML = "<i class=\"fi fi-rr-pencil\"></i>";
            edit.addEventListener("click", function () { projectEditModal(project, categories, events, function () { loadCoordinatorProjects(); }); });
            var remove = document.createElement("button");
            remove.type = "button";
            remove.title = "Excluir projeto";
            remove.className = "acao-perigo";
            remove.innerHTML = "<i class=\"fi fi-rr-trash\"></i>";
            remove.addEventListener("click", function () {
                confirmAction("Excluir o projeto " + (project.nome_projeto || "sem nome") + "? Projetos com avaliações não podem ser excluídos.", function () {
                    return api.projects.remove(project.id_projeto).then(loadCoordinatorProjects).catch(function (error) {
                        showError(error);
                        throw error;
                    });
                });
            });
            container.appendChild(edit);
            container.appendChild(remove);
        }

        function renderAssignments(container, project) {
            container.innerHTML = "";
            assignmentsFor(project).forEach(function (assignment) {
                var evaluatorId = assignmentEvaluatorId(assignment);
                var tag = document.createElement("span");
                tag.className = "atribuicao";
                tag.textContent = evaluatorName(professors.find(function (professor) {
                    return String(professor.id_usuario) === String(evaluatorId);
                }) || { id_usuario: evaluatorId });
                var remove = document.createElement("button");
                remove.type = "button";
                remove.title = "Remover atribuição";
                remove.textContent = "×";
                remove.addEventListener("click", function () {
                    api.assignments.remove(project.id_projeto, evaluatorId).then(function () {
                        assignments = assignments.filter(function (item) {
                            return !(String(assignmentProjectId(item)) === String(project.id_projeto) && String(assignmentEvaluatorId(item)) === String(evaluatorId));
                        });
                        render();
                    }).catch(showError);
                });
                tag.appendChild(remove);
                container.appendChild(tag);
            });

            var select = document.createElement("select");
            select.setAttribute("aria-label", "Selecionar avaliador");
            select.innerHTML = "<option value=\"\">Adicionar avaliador</option>";
            professors.filter(function (professor) {
                return !assignmentsFor(project).some(function (assignment) {
                    return String(assignmentEvaluatorId(assignment)) === String(professor.id_usuario);
                });
            }).forEach(function (professor) {
                var option = document.createElement("option");
                option.value = professor.id_usuario;
                option.textContent = evaluatorName(professor);
                select.appendChild(option);
            });
            var add = document.createElement("button");
            add.type = "button";
            add.textContent = "Atribuir";
            add.addEventListener("click", function () {
                if (!select.value) return;
                add.disabled = true;
                api.assignments.create(project.id_projeto, select.value).then(function (assignment) {
                    assignments.push(assignment);
                    render();
                }).catch(showError).then(function () { add.disabled = false; });
            });
            container.appendChild(select);
            container.appendChild(add);
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
            "minhas-avaliacoes.html",
            "avaliacao-enviada.html"
        ];
        var coordinatorPages = [
            "pagina-principal.html",
            "criar-projeto.html",
            "pagina-professor.html",
            "pagina-avaliadores.html",
            "visualizar-projeto.html",
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
            return Promise.all([
                api.projects.listEvaluated(event.id_evento, userId(user)),
                api.projects.listNotEvaluated(event.id_evento, userId(user))
            ]);
        }).then(function (responses) {
            var projectsById = {};
            responses.forEach(function (response, index) {
                normalizeEvents(response).forEach(function (project) {
                    var key = String(project.id_projeto);
                    project.avaliado = index === 0;
                    projectsById[key] = Object.assign(projectsById[key] || {}, project);
                    if (index === 0) projectsById[key].avaliado = true;
                });
            });
            renderProfessorProjects(Object.keys(projectsById).map(function (key) {
                return projectsById[key];
            }));
        }).catch(showError);
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
                var progressPercent = summary.total_projetos ? Math.round((summary.total_avaliados / summary.total_projetos) * 100) : 0;
                document.querySelector(".porcentagem-progressso").textContent = progressPercent + "%";
                var progressBar = document.querySelector(".progress-bar > span");
                if (progressBar) progressBar.style.width = progressPercent + "%";
                var score = document.querySelector(".pontuacao-total");
                if (score) score.textContent = panel.resumo.pontuacao_total || "0";
            }).catch(showError);
        }

    function renderProfessorProjects(projects) {
        var main = document.querySelector(".projetos-lista-api");
        if (!main) return;
        var search = document.querySelector("#barra-pesquisa");
        var categoryButtons = document.querySelectorAll(".categorias > button");
        var activeFilter = "todos";
        var categoryOf = function (project) {
            return project.nome_categoria || project.categoria || "Sem categoria";
        };

        function render() {
            var term = String(search && search.value || "").toLowerCase().trim();
            var filtered = projects.filter(function (project) {
                var category = categoryOf(project).toLowerCase();
                var statusMatches = activeFilter === "todos" ||
                    (activeFilter === "pendentes" && !project.avaliado) ||
                    (activeFilter === "avaliados" && project.avaliado);
                var textMatches = !term || String(project.nome_projeto || "").toLowerCase().indexOf(term) !== -1 ||
                    category.indexOf(term) !== -1;
                return statusMatches && textMatches;
            });
            renderProjectCards(main, filtered, categoryOf);
        }

        var categoryContainer = document.querySelector(".categorias");
        if (categoryContainer) {
            categoryContainer.innerHTML = "";
            ["Todos", "Pendentes", "Avaliados"].forEach(function (label, index) {
                var button = document.createElement("button");
                button.type = "button";
                button.textContent = label;
                button.dataset.filter = label.toLowerCase();
                if (index === 0) button.id = "select";
                button.addEventListener("click", function () {
                    activeFilter = button.dataset.filter;
                    categoryContainer.querySelectorAll("button").forEach(function (item) {
                        item.removeAttribute("id");
                    });
                    button.id = "select";
                    render();
                });
                categoryContainer.appendChild(button);
            });
        }
        if (search) search.addEventListener("input", render);
        render();
    }

    function renderProjectCards(main, projects, categoryOf) {
        main.innerHTML = "";
        if (!projects || !projects.length) {
            main.innerHTML = "<p class=\"api-empty\">Nenhum projeto encontrado para este filtro.</p>";
            return;
        }
        projects.forEach(function (project) {
            var article = document.createElement("div");
            article.className = project.avaliado ? "projeto-planta" : "projeto-braço";
            article.innerHTML = "<p class=\"materia\"></p>" +
                "<p class=\"status\"></p>" +
                "<h3></h3><p class=\"resumo-api\"></p>" +
                "<div class=\"avaliar\"><button type=\"button\"></button></div>";
            article.querySelector(".materia").textContent = categoryOf(project);
            article.querySelector(".status").textContent = project.avaliado ? "Avaliado" : "Pendente";
            article.querySelector("h3").textContent = project.nome_projeto;
            article.querySelector(".resumo-api").textContent = project.resumo || "";
            var button = article.querySelector("button");
            button.innerHTML = project.avaliado ? "<i class=\"fa-regular fa-eye\"></i><span>Visualizar</span>" : "<i class=\"fa-solid fa-list\"></i><span>Avaliar</span>";
            if (!project.avaliado) button.addEventListener("click", function () {
                    window.localStorage.setItem("sic_current_project", project.id_projeto);
                    window.location.href = "formulario.html";
                });
            main.appendChild(article);
        });
    }

    function loadMyEvaluations() {
        var page = document.querySelector("#minhas-avaliacoes");
        var user = currentUser();
        if (!page || !user || !api || !api.isConfigured()) return;

        var eventId = getEventId();
        if (!eventId) {
            document.querySelector("#minhas-lista").innerHTML = "<p class=\"api-empty\">Selecione um evento para consultar suas avaliacoes.</p>";
            return;
        }

        Promise.all([
            api.professors.panel(eventId, userId(user)),
            api.criteria.list(userId(user))
        ]).then(function (responses) {
            var panel = responses[0] || {};
            var criteriaResponse = responses[1];
            var criteria = Array.isArray(criteriaResponse) ? criteriaResponse : (criteriaResponse && criteriaResponse.data) || [];
            criteria.sort(function (first, second) {
                return Number(first.numero_criterio) - Number(second.numero_criterio);
            });
            renderMyEvaluations(panel, criteria);
        }).catch(showError);
    }

    function renderMyEvaluations(panel, criteria) {
        var projects = (panel.projetos || []).filter(function (project) {
            return project.avaliado && project.avaliacao;
        });
        var list = document.querySelector("#minhas-lista");
        var total = document.querySelector("#minhas-total");
        var score = document.querySelector("#minhas-pontuacao");
        if (total) total.textContent = projects.length;
        if (score) score.textContent = projects.reduce(function (sum, project) {
            return sum + (Number(project.avaliacao.pontuacao_total) || 0);
        }, 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
        if (!list) return;
        list.innerHTML = "";
        if (!projects.length) {
            list.innerHTML = "<p class=\"api-empty\">Voce ainda nao avaliou nenhum projeto.</p>";
            return;
        }
        projects.forEach(function (project) {
            var evaluation = project.avaliacao;
            var card = document.createElement("article");
            card.className = "avaliacao-card";
            card.innerHTML = "<h3></h3><p class=\"avaliacao-meta\"></p><div class=\"notas-avaliacao\"></div>" +
                "<div class=\"avaliacao-total\"><span>Pontuacao total</span><strong></strong></div>" +
                "<p class=\"avaliacao-comentario\"></p>";
            card.querySelector("h3").textContent = project.nome_projeto || "Projeto sem nome";
            card.querySelector(".avaliacao-meta").textContent = (project.nome_categoria || "Sem categoria") + " - Estande " + (project.estande || "-");
            card.querySelector(".avaliacao-total strong").textContent = evaluation.pontuacao_total || "0";
            card.querySelector(".avaliacao-comentario").textContent = evaluation.comentario ? "Comentario: " + evaluation.comentario : "Sem comentario informado.";
            var notes = card.querySelector(".notas-avaliacao");
            criteria.forEach(function (criterion, index) {
                var item = document.createElement("div");
                item.className = "nota-criterio";
                item.innerHTML = "<span></span><strong></strong>";
                item.querySelector("span").textContent = criterion.nome_criterio || "Criterio " + (index + 1);
                item.querySelector("strong").textContent = evaluation["nota" + (index + 1)] || "0";
                notes.appendChild(item);
            });
            list.appendChild(card);
        });
    }

    function loadEvaluationForm() {
        var form = document.querySelector("body.app-mobile main");
        var user = currentUser();
        if (!form || !form.querySelector(".caixa") || !user || !api || !api.isConfigured()) return;

        var projectId = window.localStorage.getItem("sic_current_project") || form.dataset.projectId;
        var criteriaRequest = api.criteria.list(userId(user));
        var projectRequest = projectId ? api.projects.get(projectId) : Promise.resolve(null);

        Promise.all([criteriaRequest, projectRequest]).then(function (responses) {
            var criteriaResponse = responses[0];
            var criteria = Array.isArray(criteriaResponse) ? criteriaResponse : (criteriaResponse && criteriaResponse.data) || [];
            criteria.sort(function (first, second) {
                return Number(first.numero_criterio) - Number(second.numero_criterio);
            });
            renderEvaluationCriteria(form, criteria);

            var project = responses[1];
            if (project && project.nome_projeto) {
                var projectTitle = form.querySelector(".texto-inicial h2");
                if (projectTitle) projectTitle.textContent = project.nome_projeto;
                form.dataset.projectId = project.id_projeto || projectId;
            }
        }).catch(function (error) {
            renderEvaluationCriteria(form, []);
            var submitButton = form.querySelector(".enviar button");
            if (submitButton) submitButton.disabled = true;
            showError(error);
        });
    }

    function renderEvaluationCriteria(form, criteria) {
        var boxes = form.querySelectorAll(".caixa");
        boxes.forEach(function (box, index) {
            var criterion = criteria[index];
            box.hidden = !criterion;
            if (!criterion) return;
            var title = box.querySelector("h2");
            var description = box.querySelector("p");
            var inputs = box.querySelectorAll('input[type="radio"]');
            var criterionNumber = index + 1;
            if (title) title.textContent = criterion.nome_criterio;
            if (description) description.textContent = criterion.descricao || "";

            inputs.forEach(function (input) {
                var suffix = input.value.replace(".", "");
                var inputId = "nota" + criterionNumber + "-" + suffix;
                var oldInputId = input.id;
                input.name = "nota" + criterionNumber;
                input.id = inputId;
                var label = box.querySelector('label[for="' + oldInputId + '"]');
                if (label) label.htmlFor = inputId;
            });
        });
        form.dataset.criterionCount = Math.min(criteria.length, boxes.length);
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
            var hasProjects = Number(summary.total_projetos) > 0;
            var cardValues = hasProjects ? [
                summary.total_projetos,
                summary.total_avaliacoes,
                summary.projetos_avaliados,
                summary.projetos_pendentes
            ] : ["--", "--", "--", "--"];
            cards.forEach(function (card, index) {
                card.textContent = cardValues[index];
            });
            var descriptions = [
                "Projetos cadastrados no evento",
                "Avaliações registradas pelos professores",
                "Projetos que já receberam todas as avaliações",
                "Projetos que ainda aguardam avaliações"
            ];
            document.querySelectorAll("#secao-dashboard .projetos .card .number > p").forEach(function (label, index) {
                label.textContent = hasProjects ? descriptions[index] : "Nenhum projeto cadastrado no evento";
            });
            var percentage = document.querySelector("#secao-dashboard .porcentagem h3");
            if (percentage) percentage.textContent = hasProjects ? (summary.percentual_conclusao || 0) + "%" : "--";
            var progress = document.querySelector("#secao-dashboard .barra-embaixo > div");
            if (progress) progress.style.width = hasProjects ? (Number(summary.percentual_conclusao) || 0) + "%" : "0%";
            var title = document.querySelector(".cabeca > h2");
            var subtitle = document.querySelector(".cabeca > p");
            if (title && eventData.nome_evento) title.textContent = eventData.nome_evento;
            if (subtitle && eventData.status) subtitle.textContent = "Status: " + eventData.status;
            renderDashboardChart(dashboard.grafico || []);
            renderRecentActivities(dashboard.atividades_recentes || []);
            renderNotifications(dashboard.notificacoes || []);
        }).catch(showError);
    }

    function renderNotifications(notifications) {
        var list = document.querySelector("#lista-notificacoes");
        var total = document.querySelector("#notificacoes-total");
        var counter = document.querySelector("#notificacoes-contador");
        if (!list) return;
        list.innerHTML = "";
        if (total) total.textContent = notifications.length;
        if (counter) {
            counter.textContent = notifications.length > 9 ? "9+" : notifications.length;
            counter.hidden = notifications.length === 0;
        }
        if (!notifications.length) {
            list.innerHTML = "<p class=\"notificacoes-vazio\">Nenhuma notificação.</p>";
            return;
        }

        notifications.forEach(function (notification) {
            var item = document.createElement("div");
            item.className = "notificacao-item";
            item.innerHTML = "<span class=\"notificacao-marcador\"></span><div><p></p><small></small></div>";
            item.querySelector("p").textContent = notification.mensagem || notification.message || "Nova notificação";
            item.querySelector("small").textContent = formatActivityDate(notification.data || notification.data_criacao);
            list.appendChild(item);
        });
    }

    function setupNotifications() {
        var button = document.querySelector("#btn-notificacoes");
        var panel = document.querySelector("#painel-notificacoes");
        if (!button || !panel) return;
        button.addEventListener("click", function (event) {
            event.stopPropagation();
            var isOpen = button.getAttribute("aria-expanded") === "true";
            button.setAttribute("aria-expanded", String(!isOpen));
            panel.hidden = isOpen;
        });
        document.addEventListener("click", function (event) {
            if (!event.target.closest(".notificacoes")) {
                button.setAttribute("aria-expanded", "false");
                panel.hidden = true;
            }
        });
    }

    function renderDashboardChart(data) {
        var chart = document.querySelector("#secao-dashboard .grafico");
        if (!chart) return;
        chart.innerHTML = "";
        chart.classList.toggle("grafico-visivel", data.length > 0);
        if (!data.length) {
            return;
        }

        var max = Math.max.apply(null, data.map(function (item) { return Number(item.avaliacoes) || 0; })) || 1;
        data.forEach(function (item) {
            var value = Number(item.avaliacoes) || 0;
            var bar = document.createElement("div");
            bar.className = "grafico-coluna";
            bar.innerHTML = "<div class=\"grafico-barra\"><b></b><span></span></div><small></small>";
            bar.querySelector(".grafico-barra").title = value + " avaliação(ões)";
            bar.querySelector("b").textContent = value;
            bar.querySelector("span").style.height = Math.max((value / max) * 100, 4) + "%";
            bar.querySelector("small").textContent = formatChartDate(item.data);
            chart.appendChild(bar);
        });
    }

    function formatChartDate(value) {
        var date = String(value || "");
        return date.length >= 10 ? date.slice(8, 10) + "/" + date.slice(5, 7) : date;
    }

    function renderRecentActivities(activities) {
        var list = document.querySelector("#secao-dashboard .activity-list");
        if (!list) return;
        list.innerHTML = "";
        if (!activities.length) {
            list.innerHTML = "<p class=\"api-empty\">Nenhuma atividade recente.</p>";
            return;
        }

        activities.forEach(function (activity) {
            var item = document.createElement("div");
            item.className = "activity-item";
            item.innerHTML = "<div class=\"activity-icon icon-approved\">&#10003;</div>" +
                "<div class=\"activity-text\"><p></p><span></span></div>";
            item.querySelector(".activity-text p").textContent = activity.mensagem || "Avaliação registrada";
            item.querySelector(".activity-text span").textContent = formatActivityDate(activity.data);
            list.appendChild(item);
        });
    }

    function formatActivityDate(value) {
        if (!value) return "Data não informada";
        var date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    }

    function loadRanking() {
        var ranking = document.querySelector(".ranking");
        var user = currentUser();
        if (!ranking || !user || !api || !api.isConfigured()) return;

        var eventSelect = document.querySelector("#evento-ranking");
        var categorySelect = document.querySelector("#categoria-ranking");
        var csvButton = document.querySelector("#csv");
        var currentRankingData = null;
        var eventId = getEventId();
        var eventsRequest = api.events.listByUser(userId(user)).then(function (response) {
            var events = normalizeEvents(response);
            if (eventSelect) {
                eventSelect.innerHTML = "<option value=\"\">Selecione um evento</option>";
                events.forEach(function (event) {
                    var option = document.createElement("option");
                    option.value = event.id_evento;
                    option.textContent = event.nome_evento;
                    eventSelect.appendChild(option);
                });
            }
            return events;
        });

        var eventRequest = eventsRequest.then(function (events) {
            var selectedEventId = eventId || (events[0] && events[0].id_evento);
            if (!selectedEventId) throw new Error("Nenhum evento vinculado ao usuário.");
            window.localStorage.setItem("sic_current_event", selectedEventId);
            if (eventSelect) eventSelect.value = selectedEventId;
            return api.ranking.list(selectedEventId);
        }).then(function (data) {
            currentRankingData = data;
            renderRanking(data);
        }).catch(showError);

        if (eventSelect) {
            eventSelect.addEventListener("change", function () {
                if (!eventSelect.value) return;
                window.localStorage.setItem("sic_current_event", eventSelect.value);
                api.ranking.list(eventSelect.value).then(function (data) {
                    currentRankingData = data;
                    renderRanking(data);
                }).catch(showError);
            });
        }
        if (categorySelect) {
            categorySelect.addEventListener("change", function () {
                if (!currentRankingData) return;
                window.localStorage.setItem("sic_current_category", categorySelect.value);
                renderRanking(currentRankingData);
            });
        }
        if (csvButton) {
            csvButton.addEventListener("click", function () {
                if (!currentRankingData) {
                    window.alert("Aguarde o ranking carregar para exportar.");
                    return;
                }
                exportRankingCsv(currentRankingData);
            });
        }
    }

    function exportRankingCsv(data) {
        var categories = Array.isArray(data.categorias) ? data.categorias : [];
        var selectedCategoryId = window.localStorage.getItem("sic_current_category");
        var category = categories.find(function (item) {
            return String(item.id_categoria) === String(selectedCategoryId);
        }) || categories[0];
        var projects = category && Array.isArray(category.ranking) ? category.ranking : (Array.isArray(data.ranking) ? data.ranking : []);
        var eventName = data.evento && data.evento.nome_evento || "Evento";
        var categoryName = category && category.nome_categoria || "Todas as categorias";
        var rows = [
            ["Evento", eventName],
            ["Categoria", categoryName],
            [],
            ["Posição", "Projeto", "Resumo", "Estande", "Pontuação final", "Avaliações", "Status"]
        ];
        projects.forEach(function (project) {
            var evaluated = Number(project.total_avaliacoes) > 0;
            rows.push([
                project.colocacao || "-",
                project.nome_projeto || "Projeto sem nome",
                project.resumo || "Sem resumo informado",
                project.estande || "-",
                project.nota_media || 0,
                project.total_avaliacoes || 0,
                evaluated ? "Avaliado" : "Pendente"
            ]);
        });

        var csv = "\uFEFF" + rows.map(function (row) {
            return row.map(function (value) {
                return '"' + String(value == null ? "" : value).replace(/"/g, '""') + '"';
            }).join(";");
        }).join("\r\n");
        var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        var filename = (eventName + "-" + categoryName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        link.href = url;
        link.download = "ranking-" + (filename || "evento") + ".csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function renderRanking(data) {
        var categories = Array.isArray(data.categorias) ? data.categorias : [];
        var categorySelect = document.querySelector("#categoria-ranking");
        var selectedCategoryId = window.localStorage.getItem("sic_current_category");
        var selectedCategory = categories.find(function (category) {
            return String(category.id_categoria) === String(selectedCategoryId);
        }) || categories[0];
        if (categorySelect) {
            categorySelect.innerHTML = "";
            categories.forEach(function (category) {
                var option = document.createElement("option");
                option.value = category.id_categoria;
                option.textContent = category.nome_categoria || "Categoria";
                categorySelect.appendChild(option);
            });
            categorySelect.disabled = !categories.length;
            if (selectedCategory) {
                categorySelect.value = selectedCategory.id_categoria;
                window.localStorage.setItem("sic_current_category", selectedCategory.id_categoria);
            }
        }
        var projects = selectedCategory && Array.isArray(selectedCategory.ranking) ? selectedCategory.ranking : [];
        if (!categories.length && Array.isArray(data.ranking)) projects = data.ranking;
        var eventName = data.evento && data.evento.nome_evento;
        var subtitle = document.querySelector(".ranking > .title .text p");
        var categoryName = selectedCategory && selectedCategory.nome_categoria;
        if (subtitle) subtitle.textContent = eventName ? "Ranking de " + (categoryName || "todos os projetos") + " no evento " + eventName + "." : "Ranking da categoria selecionada.";

        var cards = document.querySelectorAll(".ranking > .top > .card");
        var podiumOrder = [1, 0, 2];
        cards.forEach(function (card, index) {
            var project = projects[podiumOrder[index]];
            var name = card.querySelector(".principal h1");
            var summary = card.querySelector(".principal > p");
            var score = card.querySelector(".score h4");
            var evaluations = card.querySelector(".avaliacoes .total");
            var position = card.querySelector(".num p");
            if (!project) {
                card.hidden = true;
                return;
            }
            card.hidden = false;
            if (position) position.textContent = project.colocacao || "-";
            if (name) name.textContent = project.nome_projeto || "Projeto sem nome";
            if (summary) summary.textContent = "Estande " + (project.estande || "-");
            if (score) score.textContent = formatRankingNumber(project.nota_media);
            if (evaluations) evaluations.textContent = (Number(project.total_avaliacoes) || 0) + " avaliação(ões)";
        });

        var list = document.querySelector(".ranking .lista-projetos");
        if (!list) return;
        list.innerHTML = "";
        if (!projects.length) {
            list.innerHTML = "<p class=\"ranking-vazio\">Nenhum projeto encontrado neste evento.</p>";
            return;
        }
        projects.slice(3).forEach(function (project) {
            list.appendChild(createRankingRow(project));
        });
    }

    function createRankingRow(project) {
        var row = document.createElement("div");
        var evaluated = Number(project.total_avaliacoes) > 0;
        row.className = "tabela-linha";
        row.innerHTML = "<span class=\"posicao\"></span>" +
            "<div class=\"projeto-info\"><strong></strong><span></span></div>" +
            "<span></span><strong class=\"nota\"></strong><span></span>" +
            "<span class=\"status\"></span>";
        row.querySelector(".posicao").textContent = project.colocacao || "-";
        row.querySelector(".projeto-info strong").textContent = project.nome_projeto || "Projeto sem nome";
        row.querySelector(".projeto-info span").textContent = project.resumo || "Sem resumo informado";
        row.querySelector(".projeto-info").nextElementSibling.textContent = "Estande " + (project.estande || "-");
        row.querySelector(".nota").textContent = formatRankingNumber(project.nota_media);
        row.querySelector(".nota").nextElementSibling.textContent = (Number(project.total_avaliacoes) || 0) + " avaliação(ões)";
        row.querySelector(".status").textContent = evaluated ? "Avaliado" : "Pendente";
        row.querySelector(".status").classList.add(evaluated ? "aprovado" : "pendente");
        return row;
    }

    function formatRankingNumber(value) {
        return (Number(value) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

    document.querySelectorAll("#navegador .btn, footer .inicio, footer .projetos, footer .avaliaçoes, footer .perfil, footer .footer-item").forEach(function (control) {
        var destination = routeFor(control.textContent);
        if (!destination) return;

        if (control.closest("footer") && control.classList.contains("projetos")) {
            destination = "projetos-avaliar.html";
        } else if (control.closest("footer") && control.classList.contains("avaliaçoes")) {
            destination = "minhas-avaliacoes.html";
        }

        control.type = "button";
        control.addEventListener("click", function () {
            window.location.href = destination;
        });

        var currentPage = window.location.pathname.split("/").pop();
        if (destination === currentPage) {
            control.setAttribute("aria-current", "page");
            control.classList.add("active");
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
    if (document.querySelector("#avaliadores-projeto")) loadProjectEvaluatorOptions();
    if (document.querySelector("#categoria-projeto")) loadProjectCategoryOptions();
    if (document.querySelector("#professor-eventos")) loadProfessorEventOptions();
    if (document.querySelector("#evento-coordenador")) loadCoordinatorEventSelector();
    if (document.querySelector("#lista-professores-api")) loadCoordinatorProfessors();
    if (document.querySelector("#lista-avaliadores-api")) loadCoordinatorEvaluators();
    if (document.querySelector("#monitor-professor")) loadProfessorMonitoring();
    if (document.querySelector("#lista-projetos-api")) loadCoordinatorProjects();
    if (document.querySelector(".projetos-lista-api")) loadProfessorProjects();
    if (document.querySelector("#minhas-avaliacoes")) loadMyEvaluations();
    if (document.querySelector("body.app-mobile main")) loadEvaluationForm();
    if (document.querySelector(".ranking")) loadRanking();
    setupNotifications();
    loadProfessorHome();
    loadCoordinatorDashboard();

    var saveProjectButton = document.querySelector("#button-arquivo");
    if (saveProjectButton && api && api.isConfigured()) {
        saveProjectButton.addEventListener("click", function () {
            var eventId = document.querySelector("#evento-projeto").value;
            var categoryId = document.querySelector("#categoria-projeto").value;
            var name = document.querySelector("#nome-projeto").value.trim();
            var summary = document.querySelector("#resumo-projeto").value.trim();
            var stand = document.querySelector("#estande-projeto").value.trim();
            var evaluatorSelect = document.querySelector("#avaliadores-projeto");
            var evaluatorIds = evaluatorSelect ? Array.from(evaluatorSelect.selectedOptions).map(function (option) {
                return option.value;
            }).filter(Boolean) : [];
            if (!eventId || !categoryId || !name || !summary || !stand) {
                window.alert("Informe o evento, a categoria, o nome, o resumo e o estande do projeto.");
                return;
            }
            window.localStorage.setItem("sic_current_event", eventId);
            saveProjectButton.disabled = true;
            api.projects.create({
                id_evento: Number(eventId),
                id_categoria: Number(categoryId),
                nome_projeto: name,
                resumo: summary,
                estande: stand
            }).then(function (createdProject) {
                var projectId = createdProject && (
                    createdProject.id_projeto ||
                    (createdProject.projeto && createdProject.projeto.id_projeto) ||
                    (createdProject.data && createdProject.data.id_projeto)
                );
                if (projectId || !evaluatorIds.length) {
                    return { projectId: projectId, assignments: [] };
                }

                return api.projects.list(eventId).then(function (response) {
                    var projects = normalizeEvents(response);
                    var matches = projects.filter(function (project) {
                        return String(project.nome_projeto || "") === name &&
                            String(project.resumo || "") === summary &&
                            String(project.id_categoria) === String(categoryId);
                    });
                    var latest = matches[matches.length - 1];
                    return { projectId: latest && latest.id_projeto, assignments: [] };
                });
            }).then(function (created) {
                if (!evaluatorIds.length) return { failed: [] };
                if (!created.projectId) {
                    throw new Error("A API criou o projeto, mas não retornou o ID necessário para atribuir os avaliadores. Atualize o backend ou faça as atribuições pela tela de projetos.");
                }

                var failed = [];
                return evaluatorIds.reduce(function (promise, evaluatorId) {
                    return promise.then(function () {
                        return api.assignments.create(created.projectId, evaluatorId).catch(function (error) {
                            failed.push({ evaluatorId: evaluatorId, error: error });
                        });
                    });
                }, Promise.resolve()).then(function () {
                    return { failed: failed };
                });
            }).then(function (result) {
                if (result.failed.length) {
                    var message = result.failed.map(function (item) {
                        return "ID " + item.evaluatorId + ": " + (item.error.message || "erro desconhecido");
                    }).join("\n");
                    window.alert("Projeto criado, mas algumas atribuições falharam:\n" + message);
                }
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
            var name = document.querySelector("#professor-nome").value.trim();
            var emailInput = document.querySelector("#professor-email");
            var email = emailInput.value.trim().toLowerCase();
            var type = document.querySelector("#professor-tipo").value;
            var password = document.querySelector("#professor-senha").value;
            var eventCheckboxes = document.querySelectorAll("#professor-eventos input[type=checkbox]:checked");
            var eventIds = Array.from(eventCheckboxes).map(function (checkbox) {
                return Number(checkbox.value);
            }).filter(function (id) { return Number.isInteger(id) && id > 0; });
            emailInput.value = email;
            if (!name || !email || !type || !password || !eventIds.length) {
                window.alert("Preencha todos os dados e selecione pelo menos um evento.");
                return;
            }
            if (!emailIsValid(emailInput)) {
                emailInput.reportValidity();
                return;
            }
            registerProfessorButton.disabled = true;
            api.auth.register({
                nome: name,
                email: email,
                senha: password,
                tipo_usuario: "professor",
                tipo_avaliador: type,
                eventos: eventIds
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

                var criterionNames = ["nota1", "nota2", "nota3", "nota4", "nota5", "nota6"];
                var loadedCriterionCount = Math.min(Number(form.dataset.criterionCount) || 0, criterionNames.length);
                if (criterionNames.slice(0, loadedCriterionCount).some(function (criterion) {
                    return typeof scores[criterion] !== "number";
                })) {
                    window.alert("Selecione uma nota para todos os critérios exibidos.");
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
                    notas: criterionNames.map(function (criterion) {
                        if (typeof scores[criterion] !== "number") return 0;
                        return scores[criterion];
                    }),
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

    document.querySelectorAll(".Ver, .btn-primary-block, #btn-prof, #btn-novo-projeto").forEach(function (control) {
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