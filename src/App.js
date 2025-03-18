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

  // Add effect to handle body scroll locking
  useEffect(() => {
    // Function to toggle body scroll
    const toggleBodyScroll = (disable) => {
      if (disable) {
        // Save the current scroll position
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflowY = 'scroll';
      } else {
        // Restore the scroll position
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflowY = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    };

    // Apply scroll lock when popover is open
    if (selectedItem) {
      toggleBodyScroll(true);
    } else {
      toggleBodyScroll(false);
    }

    // Clean up function to ensure scroll is restored when component unmounts
    return () => {
      if (selectedItem) {
        toggleBodyScroll(false);
      }
    };
  }, [selectedItem]); // This effect runs when selectedItem changes

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
                      <strong>Até:</strong>{" "}
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

            {/* Event image */}
            <div className="popover-image">
              <img
                src={selectedItem.image_image?.all}
                alt={
                  selectedItem.text_display_title?.all
                    ? decodeHtml(selectedItem.text_display_title.all)
                    : ""
                }
              />
            </div>

            {/* Event title */}
            <h2>
              {selectedItem.text_display_title?.all
                ? decodeHtml(selectedItem.text_display_title.all)
                : ""}
            </h2>

            {/* Event description */}
            <SanitizedHTML
              html={selectedItem.text_sinopse?.all}
              className="description"
            />

            {/* Location information */}
            {selectedItem.ref_local && related[selectedItem.ref_local] && (
              <div className="location-info">
                <h3>Localização</h3>
                <div className="location-container">
                  {related[selectedItem.ref_local].image_image?.all && (
                    <div className="location-image">
                      <img
                        src={related[selectedItem.ref_local].image_image.all}
                        alt={
                          related[selectedItem.ref_local]._title?.all
                            ? decodeHtml(related[selectedItem.ref_local]._title.all)
                            : "Location"
                        }
                      />
                    </div>
                  )}
                  <div className="location-details">
                    <h4>
                      {related[selectedItem.ref_local]._title?.all
                        ? decodeHtml(related[selectedItem.ref_local]._title.all)
                        : ""}
                    </h4>

                    {related[selectedItem.ref_local].text_morada?.all && (
                      <p className="location-address">
                        <strong>Endereço:</strong>{" "}
                        {related[selectedItem.ref_local].text_morada.all}
                      </p>
                    )}

                    <div className="location-links">
                      {related[selectedItem.ref_local].link_website?.all && (
                        <a
                          href={related[selectedItem.ref_local].link_website.all}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="location-link website-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Website
                        </a>
                      )}

                      {related[selectedItem.ref_local].link_google_maps?.all && (
                        <a
                          href={related[selectedItem.ref_local].link_google_maps.all}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="location-link maps-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Google Maps
                        </a>
                      )}
                    </div>

                    {related[selectedItem.ref_local].text_description?.all && (
                      <SanitizedHTML
                        html={related[selectedItem.ref_local].text_description.all}
                        className="location-description"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
