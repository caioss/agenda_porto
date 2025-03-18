import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import apiData from "./request";
import "./App.css";

function App() {
  const [items, setItems] = useState([]);
  const [related, setRelated] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("https://repeater.bondlayer.com/fetch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(apiData),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }

        const data = await response.json();
        setItems(data.items || []);
        setRelated(data.related || {});
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isSameDay = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const decodeHtml = (html) => {
    const textArea = document.createElement("textarea");
    textArea.innerHTML = html;
    return textArea.value;
  };

  const handleCardClick = (item) => {
    setSelectedItem(item);
  };

  // Create a sanitized HTML component
  const SanitizedHTML = ({ html, className }) => {
    if (!html) return null;
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
      />
    );
  };

  return (
    <div className="App">
      <h1>Agenda Porto</h1>

      {loading ? (
        <div className="loading">Carregando eventos...</div>
      ) : error ? (
        <div className="error">Erro: {error}</div>
      ) : (
        <div className="card-container">
          {items.map((item) => (
            <div
              key={item.id}
              className="card"
              onClick={() => handleCardClick(item)}
            >
              <div className="card-image">
                <img
                  src={item.image_image?.all}
                  alt={
                    item.text_display_title?.all
                      ? decodeHtml(item.text_display_title.all)
                      : ""
                  }
                />
              </div>
              <div className="card-content">
                <h3>
                  {item.text_display_title?.all
                    ? decodeHtml(item.text_display_title.all)
                    : ""}
                </h3>

                {item.ref_seccao && related[item.ref_seccao] && (
                  <span className="category">
                    {related[item.ref_seccao]._title?.all}
                  </span>
                )}

                <div className="date-info">
                  <p>
                    <strong>Data:</strong>{" "}
                    {formatDateTime(item.datetime_start_date)}
                  </p>
                  {!isSameDay(item.datetime_start_date, item.datetime_end_date) && (
                    <p>
                      <strong>Fim:</strong>{" "}
                      {formatDateTime(item.datetime_end_date)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedItem && (
        <div className="popover-overlay" onClick={() => setSelectedItem(null)}>
          <div className="popover-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedItem(null)}>
              ×
            </button>
            <h2>
              {selectedItem.text_display_title?.all
                ? decodeHtml(selectedItem.text_display_title.all)
                : ""}
            </h2>
            <SanitizedHTML
              html={selectedItem.text_sinopse?.all}
              className="description"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
