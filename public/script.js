document.addEventListener("DOMContentLoaded", () => {
      const chatTab = document.getElementById("chat-tab");
      const poolTab = document.getElementById("pool-tab");
      const chatContent = document.getElementById("chat");
      const poolContent = document.getElementById("pool");
  
      const messageInput = document.getElementById("message");
      const sendMessageBtn = document.getElementById("send-btn");
      const messageCount = document.getElementById("message-count");
      const leaderboard = document.getElementById("leaderboard");
  
      const tg = window.Telegram.WebApp;
      let username = null;
      let tgId = null;
  
      // Автоматическая регистрация
      if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
          username = tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name;
          tgId = tg.initDataUnsafe.user.id;
  
          fetch("/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tg_id: tgId, name: username }),
          })
              .then((res) => res.json())
              .then(() => loadUserMessages())
              .catch(console.error);
      }
  
      // Загрузить доступные сообщения
      function loadUserMessages() {
          fetch(`/get-user-messages?tg_id=${tgId}`)
              .then((res) => res.json())
              .then((data) => {
                  messageCount.innerText = `Available messages: ${data.messages}`;
              })
              .catch(console.error);
      }
  
      // Отправить сообщение ИИ
      sendMessageBtn.addEventListener("click", () => {
          const message = messageInput.value;
          fetch("/send-message", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tg_id: tgId, message }),
          })
              .then((res) => res.json())
              .then((data) => {
                  alert(data.reply);
                  loadUserMessages();
              })
              .catch(console.error);
      });
  
      // Лидерборд
      poolTab.addEventListener("click", () => {
          fetch("/leaderboard")
              .then((res) => res.json())
              .then((data) => {
                  leaderboard.innerHTML = data.map((user, i) => `<div>${i + 1}. ${user.name} - ${user.stars} stars</div>`).join("");
              })
              .catch(console.error);
      });
  
      chatTab.click(); // Открыть вкладку "Chat" по умолчанию
  });